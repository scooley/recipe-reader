import { ManagedIdentityCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import type { Config } from "./config.ts";
import { StorageConflict } from "./errors.ts";

export interface StoredObject {
  bytes: Uint8Array;
  etag: string;
}

export interface ObjectStore {
  get(key: string): Promise<StoredObject | null>;
  put(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    condition: { ifMatch: string } | { ifNoneMatch: true },
  ): Promise<string>;
  remove(key: string, ifMatch?: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
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
    ).getContainerClient(config.storageContainer);
  }

  async verifyPrivateContainer(): Promise<void> {
    const access = await this.container.getAccessPolicy();
    if (access.blobPublicAccess) {
      throw new Error(
        "The assistant's Blob container must not allow anonymous access",
      );
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const response = await this.container.getBlobClient(key).download();
      if (!response.readableStreamBody || !response.etag) {
        throw new Error("Blob download is missing its content or ETag");
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of response.readableStreamBody) {
        if (typeof chunk === "string") {
          throw new Error("Blob download returned text instead of bytes");
        }
        size += chunk.length;
        if (size > 26 * 1024 * 1024) {
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
  ): Promise<string> {
    try {
      const result = await this.container.getBlockBlobClient(key).uploadData(
        bytes,
        {
          conditions: "ifMatch" in condition
            ? { ifMatch: condition.ifMatch }
            : { ifNoneMatch: "*" },
          blobHTTPHeaders: { blobContentType: contentType },
        },
      );
      if (!result.etag) throw new Error("Blob write did not return an ETag");
      return result.etag;
    } catch (error) {
      if ([409, 412].includes(statusCode(error) ?? 0)) {
        throw new StorageConflict();
      }
      throw error;
    }
  }

  async remove(key: string, ifMatch?: string): Promise<void> {
    try {
      await this.container.getBlobClient(key).deleteIfExists({
        conditions: ifMatch ? { ifMatch } : undefined,
      });
    } catch (error) {
      if ([409, 412].includes(statusCode(error) ?? 0)) {
        throw new StorageConflict();
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for await (const blob of this.container.listBlobsFlat({ prefix })) {
      keys.push(blob.name);
    }
    return keys;
  }
}

export class MemoryStore implements ObjectStore {
  private readonly objects = new Map<string, StoredObject>();
  private revision = 0;

  get(key: string): Promise<StoredObject | null> {
    const object = this.objects.get(key);
    return Promise.resolve(
      object ? { bytes: object.bytes.slice(), etag: object.etag } : null,
    );
  }

  put(
    key: string,
    bytes: Uint8Array,
    _contentType: string,
    condition: { ifMatch: string } | { ifNoneMatch: true },
  ): Promise<string> {
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

  remove(key: string, ifMatch?: string): Promise<void> {
    const current = this.objects.get(key);
    if (ifMatch && current?.etag !== ifMatch) {
      return Promise.reject(new StorageConflict());
    }
    this.objects.delete(key);
    return Promise.resolve();
  }

  list(prefix: string): Promise<string[]> {
    return Promise.resolve(
      [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort(),
    );
  }
}
