import { HttpError } from "./errors.ts";

export interface Config {
  token: string;
  previousToken?: string;
  tenantId: string;
  audience: string;
  ownerOid: string;
  scope: string;
  spaClientId: string;
  storageMode: "azure" | "memory";
  storageAccountUrl?: string;
  storageContainer?: string;
  identityClientId?: string;
  host: string;
  port: number;
  authProbe: boolean;
}

export function readConfig(env: Record<string, string | undefined>): Config {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Missing configuration: ${name}`);
    return value;
  };
  const uuid = (name: string): string => {
    const value = required(name);
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)) {
      throw new Error(`${name} must be an Entra UUID`);
    }
    return value.toLowerCase();
  };

  const token = required("ASSISTANT_API_TOKEN");
  const previousToken = env.ASSISTANT_API_TOKEN_PREVIOUS?.trim() || undefined;
  if (token.length < 32 || (previousToken && previousToken.length < 32)) {
    throw new Error("Service tokens must be at least 32 characters");
  }
  if (previousToken === token) {
    throw new Error("The current and previous tokens must differ");
  }

  const storageMode = env.STORAGE_MODE === "memory" ? "memory" : "azure";
  if (env.STORAGE_MODE && !["azure", "memory"].includes(env.STORAGE_MODE)) {
    throw new Error("STORAGE_MODE must be azure or memory");
  }
  const host = env.HOST || (storageMode === "memory" ? "127.0.0.1" : "0.0.0.0");
  if (
    storageMode === "memory" &&
    (env.ALLOW_INSECURE_LOCAL_DEV !== "true" || host !== "127.0.0.1")
  ) {
    throw new Error(
      "In-memory storage requires explicit local-only opt-in and loopback binding",
    );
  }
  const port = Number(env.PORT || "8080");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be between 1 and 65535");
  }
  const tenantId = uuid("ENTRA_TENANT_ID");
  const ownerOid = uuid("ENTRA_OWNER_OID");
  const spaClientId = uuid("ENTRA_SPA_CLIENT_ID");
  const audience = required("ENTRA_API_AUDIENCE");
  if (!/^api:\/\/[0-9a-f-]{36}$|^[0-9a-f-]{36}$/i.test(audience)) {
    throw new Error(
      "ENTRA_API_AUDIENCE must be the API app ID or api://<API app ID>",
    );
  }
  const scope = required("ENTRA_SCOPE");
  if (!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(scope)) {
    throw new Error("ENTRA_SCOPE must be a delegated scope name");
  }
  const storageAccountUrl = env.STORAGE_ACCOUNT_URL?.trim();
  const storageContainer = env.STORAGE_CONTAINER?.trim();
  if (
    storageMode === "azure" &&
    (!storageAccountUrl ||
      !/^https:\/\/[a-z0-9-]+\.blob\.core\.windows\.net\/?$/i.test(
        storageAccountUrl,
      ) ||
      !storageContainer ||
      !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(storageContainer))
  ) {
    throw new Error(
      "Set a valid STORAGE_ACCOUNT_URL and private STORAGE_CONTAINER",
    );
  }
  return {
    token,
    previousToken,
    tenantId,
    ownerOid,
    spaClientId,
    audience,
    scope,
    storageMode,
    storageAccountUrl,
    storageContainer,
    identityClientId: env.AZURE_CLIENT_ID?.trim(),
    host,
    port,
    authProbe: env.ENABLE_AUTH_PROBE === "true",
  };
}

export function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "invalid_json", "Expected valid JSON");
  }
}
