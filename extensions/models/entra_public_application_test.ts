import { deepEqual, rejects } from "node:assert/strict";
import { configurePublicApplication } from "./entra_public_application.ts";

const tenantId = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const appId = "00000000-0000-4000-8000-000000000003";
const application = {
  id,
  appId,
  displayName: "test",
  signInAudience: "AzureADMyOrg",
};

Deno.test("tenant mismatch stops before any Graph request", async () => {
  await rejects(() =>
    configurePublicApplication({ displayName: "test" }, {
      globalArgs: { tenantId },
      writeResource: () => {
        throw new Error("Unexpected data write");
      },
    }, {
      account: () => Promise.resolve({ tenantId: appId }),
      request: () => {
        throw new Error("Unexpected Graph request");
      },
    }), /tenant differs/);
});

Deno.test("duplicate creation does not mutate an existing application", async () => {
  const methods: string[] = [];
  await rejects(() =>
    configurePublicApplication({ displayName: "test" }, {
      globalArgs: { tenantId },
      writeResource: () => {
        throw new Error("Unexpected data write");
      },
    }, {
      account: () => Promise.resolve({ tenantId }),
      request: (method) => {
        methods.push(method);
        return Promise.resolve({ status: 200, data: { value: [{ id }] } });
      },
    }), /already exists/);
  deepEqual(methods, ["GET"]);
});

Deno.test("redirect update preserves omitted settings and persists the fresh response", async () => {
  const redirectUris = ["https://example.com/manage/redirect"];
  const requests: { method: string; path: string; body: unknown }[] = [];
  const stored: unknown[] = [];
  await configurePublicApplication({ id, tenantId, spa: { redirectUris } }, {
    globalArgs: { tenantId },
    writeResource: (_spec, name, data) => {
      stored.push(data);
      return Promise.resolve({ name });
    },
  }, {
    account: () => Promise.resolve({ tenantId }),
    request: (method, path, body) => {
      requests.push({ method, path, body });
      return Promise.resolve({
        status: method === "PATCH" ? 204 : 200,
        data: { ...application, spa: { redirectUris } },
      });
    },
  });
  deepEqual(requests.map((request) => request.method), ["GET", "PATCH", "GET"]);
  deepEqual(requests[1].body, {
    spa: { redirectUris },
    signInAudience: "AzureADMyOrg",
  });
  deepEqual(stored, [{ ...application, spa: { redirectUris } }]);
});
