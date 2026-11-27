import { HttpError, StorageConflict } from "./errors.ts";
import { sha256 } from "./documents.ts";
import type { ObjectStore, StorageOptions } from "./storage.ts";

export interface RegisteredArtifact {
  key: string;
  sha256: string;
  size: number;
}

export interface SourceWrite {
  id: string;
  expectedRevision: number;
  deadline: string;
  artifacts: RegisteredArtifact[];
  publication: "pending" | "published" | "failed";
  cleanup: "pending" | "cleaned";
}

export interface SourceFence {
  open: boolean;
  writes: SourceWrite[];
}

export function registerSourceWrite(
  fence: SourceFence,
  write: SourceWrite,
): SourceFence {
  if (!fence.open) {
    throw new HttpError(409, "project_closed", "Source access is closed");
  }
  if (fence.writes.length >= 1000) {
    throw new HttpError(
      409,
      "source_operation_limit",
      "Project source-operation limit reached",
    );
  }
  if (
    fence.writes.some((item) =>
      item.id === write.id ||
      item.artifacts.some((artifact) =>
        write.artifacts.some((next) => next.key === artifact.key)
      )
    )
  ) {
    throw new HttpError(
      409,
      "source_operation_conflict",
      "Source operation or artifact is already registered",
    );
  }
  return { ...fence, writes: [...fence.writes, write] };
}

export function assertSourceWrite(
  fence: SourceFence,
  id: string,
  now: Date,
): SourceWrite {
  const write = fence.writes.find((item) => item.id === id);
  if (!fence.open) {
    throw new HttpError(409, "project_closed", "Source access is closed");
  }
  if (
    !write || write.publication !== "pending" || write.cleanup === "cleaned" ||
    Date.parse(write.deadline) <= now.getTime()
  ) {
    throw new HttpError(
      409,
      "source_operation_expired",
      "Source operation is unavailable or expired",
    );
  }
  return write;
}

export async function writeSourceArtifact(
  store: ObjectStore,
  artifact: RegisteredArtifact,
  bytes: Uint8Array,
  contentType: string,
  verifyFence: () => Promise<void>,
  options?: StorageOptions,
): Promise<void> {
  if (artifact.size !== bytes.length || sha256(bytes) !== artifact.sha256) {
    throw new HttpError(
      422,
      "artifact_mismatch",
      "Artifact does not match its registration",
    );
  }
  const placeholder = await store.put(
    artifact.key,
    new Uint8Array(),
    contentType,
    { ifNoneMatch: true },
    options,
  );
  await verifyFence();
  await store.put(
    artifact.key,
    bytes,
    contentType,
    { ifMatch: placeholder },
    options,
  );
  const verified = await store.get(artifact.key, options);
  if (
    !verified || verified.bytes.length !== artifact.size ||
    sha256(verified.bytes) !== artifact.sha256
  ) {
    throw new HttpError(
      502,
      "artifact_mismatch",
      "Stored artifact could not be verified",
    );
  }
}

export async function sealSourceArtifacts(
  store: ObjectStore,
  keys: string[],
  options?: StorageOptions,
): Promise<void> {
  for (const key of new Set(keys)) {
    let sealed: string | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await store.stat(key, options);
      try {
        sealed = await store.put(
          key,
          new Uint8Array(),
          "application/octet-stream",
          current ? { ifMatch: current.etag } : { ifNoneMatch: true },
          options,
        );
        break;
      } catch (error) {
        if (!(error instanceof StorageConflict)) throw error;
      }
    }
    if (!sealed) {
      throw new StorageConflict(
        "Source artifact changed repeatedly during sealing",
      );
    }
    await store.remove(key, sealed, options);
  }
}
