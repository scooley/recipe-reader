import { ManagedIdentityCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import type { Config } from "./config.ts";
import { HttpError, StorageConflict, StorageUncertain } from "./errors.ts";

export const MAX_OBJECT_BYTES = 26 * 1024 * 1024;

export interface StorageOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ObjectMetadata {
  etag: string;
  size: number;
}

export interface StoredObject {
  bytes: Uint8Array;
  etag: string;
}

export interface ObjectStore {
  get(key: string, options?: StorageOptions): Promise<StoredObject | null>;
  stat(key: string, options?: StorageOptions): Promise<ObjectMetadata | null>;
  put(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    condition: { ifMatch: string } | { ifNoneMatch: true },
    options?: StorageOptions,
  ): Promise<string>;
  remove(
    key: string,
    ifMatch?: string,
    options?: StorageOptions,
  ): Promise<void>;
  list(prefix: string, options?: StorageOptions): Promise<string[]>;
  listProjectRecords(options?: StorageOptions): Promise<string[]>;
}

function signalFor(options: StorageOptions = {}): AbortSignal {
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000
  ) {
    throw new Error("Storage timeout must be 1-120000 milliseconds");
  }
  return options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
}

function boundedKeys(keys: string[]): string[] {
  if (keys.length > 1000) {
    throw new HttpError(
      503,
      "storage_list_limit",
      "Storage listing exceeds 1,000 entries",
    );
  }
  return keys;
}

function checkSize(bytes: Uint8Array): void {
  if (bytes.length > MAX_OBJECT_BYTES) {
    throw new HttpError(
      413,
      "storage_object_limit",
      "Stored object exceeds 26 MiB",
    );
  }
}

function statusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) {
    return undefined;
  }
  return (error as { statusCode?: number }).statusCode;
}

export class AzureStore implements ObjectStore {
  private readonly container;

  constructor(config: Config) {
    if (!config.storageAccountUrl || !config.storageContainer) {
      throw new Error("Azure storage is not configured");
    }
    const credential = config.identityClientId
      ? new ManagedIdentityCredential(config.identityClientId)
      : new ManagedIdentityCredential();
    this.container = new BlobServiceClient(
      config.storageAccountUrl,
      credential,
      { retryOptions: { maxTries: 1 } },
    ).getContainerClient(config.storageContainer);
  }

  async verifyPrivateContainer(): Promise<void> {
    const properties = await this.container.getProperties();
    if (properties.blobPublicAccess) {
      throw new Error(
        "The assistant's Blob container must not allow anonymous access",
      );
    }
  }

  async stat(
    key: string,
    options?: StorageOptions,
  ): Promise<ObjectMetadata | null> {
    try {
      const properties = await this.container.getBlobClient(key).getProperties({
        abortSignal: signalFor(options),
      });
      if (!properties.etag || properties.contentLength === undefined) {
        throw new Error("Blob metadata is incomplete");
      }
      return { etag: properties.etag, size: properties.contentLength };
    } catch (error) {
      if (statusCode(error) === 404) return null;
      throw error;
    }
  }

  async get(
    key: string,
    options?: StorageOptions,
  ): Promise<StoredObject | null> {
    const signal = signalFor(options);
    try {
      const response = await this.container.getBlobClient(key).download(
        0,
        undefined,
        { abortSignal: signal },
      );
      if (!response.readableStreamBody || !response.etag) {
        throw new Error("Blob download is missing its content or ETag");
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of response.readableStreamBody) {
        signal.throwIfAborted();
        if (typeof chunk === "string") {
          throw new Error("Blob download returned text instead of bytes");
        }
        size += chunk.length;
        if (size > MAX_OBJECT_BYTES) {
          throw new Error("Stored object exceeds the size limit");
        }
        chunks.push(chunk);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return { bytes, etag: response.etag };
    } catch (error) {
      if (statusCode(error) === 404) return null;
      throw error;
    }
  }

  async put(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    condition: { ifMatch: string } | { ifNoneMatch: true },
    options?: StorageOptions,
  ): Promise<string> {
    checkSize(bytes);
    const signal = signalFor(options);
    signal.throwIfAborted();
    try {
      const result = await this.container.getBlockBlobClient(key).uploadData(
        bytes,
        {
          conditions: "ifMatch" in condition
            ? { ifMatch: condition.ifMatch }
            : { ifNoneMatch: "*" },
          blobHTTPHeaders: { blobContentType: contentType },
          abortSignal: signal,
          maxSingleShotSize: MAX_OBJECT_BYTES,
        },
      );
      if (!result.etag) throw new Error("Blob write did not return an ETag");
      return result.etag;
    } catch (error) {
      if ([409, 412].includes(statusCode(error) ?? 0)) {
        throw new StorageConflict();
      }
      const status = statusCode(error);
      if (status === undefined || status === 408 || status >= 500) {
        throw new StorageUncertain("put", key);
      }
      throw error;
    }
  }

  async remove(
    key: string,
    ifMatch?: string,
    options?: StorageOptions,
  ): Promise<void> {
    const signal = signalFor(options);
    signal.throwIfAborted();
    try {
      const result = await this.container.getBlobClient(key).deleteIfExists({
        conditions: ifMatch ? { ifMatch } : undefined,
        abortSignal: signal,
      });
      if (ifMatch && !result.succeeded) throw new StorageConflict();
    } catch (error) {
      if (error instanceof StorageConflict) throw error;
      if ([409, 412].includes(statusCode(error) ?? 0)) {
        throw new StorageConflict();
      }
      const status = statusCode(error);
      if (status === undefined || status === 408 || status >= 500) {
        throw new StorageUncertain("remove", key);
      }
      throw error;
    }
  }

  async list(prefix: string, options?: StorageOptions): Promise<string[]> {
    const keys: string[] = [];
    for await (
      const blob of this.container.listBlobsFlat({
        prefix,
        abortSignal: signalFor(options),
      })
    ) {
      keys.push(blob.name);
      boundedKeys(keys);
    }
    return keys;
  }

  async listProjectRecords(options?: StorageOptions): Promise<string[]> {
    const keys: string[] = [];
    for await (
      const item of this.container.listBlobsByHierarchy("/", {
        prefix: "projects/",
        abortSignal: signalFor(options),
      })
    ) {
      if (
        item.kind === "prefix" && /^projects\/[0-9a-f-]{36}\/$/.test(item.name)
      ) {
        keys.push(`${item.name}project.md`);
        boundedKeys(keys);
      }
    }
    return keys;
  }
}

export class MemoryStore implements ObjectStore {
  private readonly objects = new Map<string, StoredObject>();
  private revision = 0;

  get(key: string, options?: StorageOptions): Promise<StoredObject | null> {
    signalFor(options).throwIfAborted();
    const object = this.objects.get(key);
    return Promise.resolve(
      object ? { bytes: object.bytes.slice(), etag: object.etag } : null,
    );
  }

  stat(key: string, options?: StorageOptions): Promise<ObjectMetadata | null> {
    signalFor(options).throwIfAborted();
    const object = this.objects.get(key);
    return Promise.resolve(
      object ? { etag: object.etag, size: object.bytes.length } : null,
    );
  }

  put(
    key: string,
    bytes: Uint8Array,
    _contentType: string,
    condition: { ifMatch: string } | { ifNoneMatch: true },
    options?: StorageOptions,
  ): Promise<string> {
    signalFor(options).throwIfAborted();
    checkSize(bytes);
    const current = this.objects.get(key);
    if (
      ("ifMatch" in condition && current?.etag !== condition.ifMatch) ||
      ("ifNoneMatch" in condition && current)
    ) {
      return Promise.reject(new StorageConflict());
    }
    const etag = `"${++this.revision}"`;
    this.objects.set(key, { bytes: bytes.slice(), etag });
    return Promise.resolve(etag);
  }

  remove(
    key: string,
    ifMatch?: string,
    options?: StorageOptions,
  ): Promise<void> {
    signalFor(options).throwIfAborted();
    const current = this.objects.get(key);
    if (ifMatch && current?.etag !== ifMatch) {
      return Promise.reject(new StorageConflict());
    }
    this.objects.delete(key);
    return Promise.resolve();
  }

  list(prefix: string, options?: StorageOptions): Promise<string[]> {
    signalFor(options).throwIfAborted();
    return Promise.resolve(
      boundedKeys(
        [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort(),
      ),
    );
  }

  listProjectRecords(options?: StorageOptions): Promise<string[]> {
    signalFor(options).throwIfAborted();
    return Promise.resolve(
      boundedKeys(
        [...this.objects.keys()].filter((key) =>
          /^projects\/[0-9a-f-]{36}\/project\.md$/.test(key)
        ).sort(),
      ),
    );
  }
}
