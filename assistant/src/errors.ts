export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class StorageConflict extends Error {}

export class StorageUncertain extends Error {
  constructor(readonly operation: "put" | "remove", readonly key: string) {
    super(
      `Storage ${operation} outcome is uncertain; reconcile before retrying`,
    );
  }
}

export function requireText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string" || !value.trim() ||
    value.length > maxLength ||
    [...value].some((char) =>
      char.charCodeAt(0) < 32 && !"\t\n\r".includes(char)
    )
  ) {
    throw new HttpError(
      400,
      "invalid_input",
      `${field} must be 1-${maxLength} characters`,
    );
  }
  return value.trim();
}

export function requireRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new HttpError(
      400,
      "invalid_input",
      "expectedRevision must be a positive integer",
    );
  }
  return value as number;
}

export function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "invalid_input", "Expected a JSON object");
  }
  return value as Record<string, unknown>;
}
