import { z } from "npm:zod@4.3.6";
import {
  az,
  graphRequest,
} from "../../.swamp/pulled-extensions/@dougschaefer/azure/models/azure/_helpers.ts";

const ScopeSchema = z.strictObject({
  id: z.uuid(),
  value: z.string().min(1),
  type: z.literal("User"),
  isEnabled: z.boolean(),
  adminConsentDisplayName: z.string(),
  adminConsentDescription: z.string(),
  userConsentDisplayName: z.string(),
  userConsentDescription: z.string(),
});

const PublicSettingsSchema = z.strictObject({
  displayName: z.string().min(1).optional(),
  identifierUris: z.array(z.string().url()).optional(),
  api: z.strictObject({
    requestedAccessTokenVersion: z.literal(2),
    oauth2PermissionScopes: z.array(ScopeSchema),
  }).optional(),
  spa: z.strictObject({
    redirectUris: z.array(
      z.url().refine((value) => {
        const url = new URL(value);
        return url.protocol === "https:" ||
          (url.protocol === "http:" && url.hostname === "127.0.0.1");
      }, "SPA redirects require HTTPS or loopback HTTP"),
    ),
  }).optional(),
  requiredResourceAccess: z.array(z.strictObject({
    resourceAppId: z.uuid(),
    resourceAccess: z.array(z.strictObject({
      id: z.uuid(),
      type: z.literal("Scope"),
    })),
  })).optional(),
});

const ArgumentsSchema = PublicSettingsSchema.extend({
  id: z.uuid().optional(),
})
  // Swamp includes global inputs in method payloads; exclude them from Graph writes.
  .strip()
  .refine(
    (args) => args.id || args.displayName,
    "Creation requires displayName",
  )
  .refine(
    (args) => Object.keys(args).some((key) => key !== "id"),
    "At least one public setting is required",
  );

const ApplicationSchema = z.object({
  id: z.uuid(),
  appId: z.uuid(),
  displayName: z.string(),
  signInAudience: z.literal("AzureADMyOrg"),
  identifierUris: z.array(z.string()).optional(),
  api: z.object({
    requestedAccessTokenVersion: z.number().nullable(),
    oauth2PermissionScopes: z.array(z.object(ScopeSchema.shape)),
  }).optional(),
  spa: z.object({ redirectUris: z.array(z.string()) }).optional(),
  requiredResourceAccess: PublicSettingsSchema.shape.requiredResourceAccess,
});

type Context = {
  globalArgs: { tenantId?: string };
  writeResource: (
    spec: string,
    name: string,
    value: Record<string, unknown>,
  ) => Promise<{ name: string }>;
};

const clients = {
  account: () => az(["account", "show"]),
  request: graphRequest,
};

async function tenantRequest(
  tenantId: string | undefined,
  api = clients,
) {
  const expectedTenant = z.uuid().parse(tenantId);
  const account = z.object({ tenantId: z.uuid() }).parse(await api.account());
  if (account.tenantId !== expectedTenant) {
    throw new Error(
      "Active Azure tenant differs from the requested Entra tenant",
    );
  }
  return async (method: string, path: string, body?: unknown) => {
    const response = await api.request(method, path, body);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Graph ${method} failed (${response.status}): ${
          JSON.stringify(response.data).slice(0, 1000)
        }`,
      );
    }
    return response.data;
  };
}

export async function configurePublicApplication(
  input: unknown,
  context: Context,
  api = clients,
) {
  const args = ArgumentsSchema.parse(input);
  const request = await tenantRequest(context.globalArgs.tenantId, api);
  const { id, ...settings } = args;
  const body = { ...settings, signInAudience: "AzureADMyOrg" };
  let application: z.infer<typeof ApplicationSchema>;
  if (id) {
    ApplicationSchema.parse(await request("GET", `/applications/${id}`));
    await request("PATCH", `/applications/${id}`, body);
    application = ApplicationSchema.parse(
      await request("GET", `/applications/${id}`),
    );
  } else {
    if (!args.displayName) throw new Error("Creation requires displayName");
    const filter = encodeURIComponent(
      `displayName eq '${args.displayName.replaceAll("'", "''")}'`,
    );
    const matches = z.object({ value: z.array(z.unknown()) }).parse(
      await request("GET", `/applications?$filter=${filter}&$select=id&$top=1`),
    );
    if (matches.value.length) {
      throw new Error(
        "Application name already exists; inspect it and supply its object id",
      );
    }
    application = ApplicationSchema.parse(
      await request("POST", "/applications", body),
    );
  }
  const handle = await context.writeResource(
    "application",
    application.id,
    application,
  );
  return { dataHandles: [handle] };
}

const EnterpriseArgumentsSchema = z.object({ applicationId: z.uuid() });
const EnterpriseApplicationSchema = z.object({
  id: z.uuid(),
  appId: z.uuid(),
  servicePrincipalType: z.literal("Application"),
  accountEnabled: z.boolean(),
});

export async function ensureEnterpriseApplication(
  input: unknown,
  context: Context,
  api = clients,
) {
  const args = EnterpriseArgumentsSchema.parse(input);
  const request = await tenantRequest(context.globalArgs.tenantId, api);
  const application = ApplicationSchema.parse(
    await request("GET", `/applications/${args.applicationId}`),
  );
  const filter = encodeURIComponent(`appId eq '${application.appId}'`);
  const matches = z.object({ value: z.array(EnterpriseApplicationSchema) })
    .parse(
      await request(
        "GET",
        `/servicePrincipals?$filter=${filter}&$select=id,appId,servicePrincipalType,accountEnabled&$top=2`,
      ),
    );
  if (matches.value.length > 1) {
    throw new Error("Multiple service principals matched the application");
  }
  const principal = matches.value[0] ?? EnterpriseApplicationSchema.parse(
    await request("POST", "/servicePrincipals", { appId: application.appId }),
  );
  if (principal.appId !== application.appId || !principal.accountEnabled) {
    throw new Error(
      "Service principal is disabled or belongs to a different application",
    );
  }
  const handle = await context.writeResource(
    "enterpriseApplication",
    principal.id,
    principal,
  );
  return { dataHandles: [handle] };
}

export const extension = {
  type: "@dougschaefer/azure-ad-app-registration",
  resources: {
    enterpriseApplication: {
      description:
        "Enabled local service principal for a single-tenant public application",
      schema: EnterpriseApplicationSchema,
      lifetime: "infinite",
      garbageCollection: 5,
    },
  },
  methods: [{
    configurePublicApplication: {
      description:
        "Create or update a single-tenant public application without client secrets. An update requires its exact object id; creation rejects duplicate names.",
      arguments: ArgumentsSchema,
      execute: configurePublicApplication,
    },
    ensureEnterpriseApplication: {
      description:
        "Ensure a local service principal exists for a verified single-tenant registration, without credentials or tenant-wide consent grants.",
      arguments: EnterpriseArgumentsSchema,
      execute: ensureEnterpriseApplication,
    },
  }],
};
