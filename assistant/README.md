# Personal pattern and recipe assistant

Deno HTTP backend for the existing LiveKit Agent Builder Live preview. Private
Azure Blob Storage holds Markdown project records and source snapshots. The
Entra-authenticated source page is at `/manage/`; it is not a voice client.

**Implemented:** project creation/selection/listing, explicit progress and
corrections, separate modifications and pending follow-ups, text-only PDFs,
public HTTPS HTML imports, completion cleanup, and title-confirmed deletion.
Ravelry routes return `501 ravelry_unavailable`; no Ravelry credentials or write
operations are supported. This checkout is not an Azure deployment.

## Where to add your information

Copy `.env.example` to `.env` inside `assistant/` for local configuration. In
Azure, set the same names as Container App environment variables, using secret
references for bearer tokens. Do not send secrets in chat or commit `.env`.

For the [Bicep deployment](#azure-deployment-with-bicep), supply only the Entra
IDs, image tag, and service token. Bicep wires up storage, managed identity, and
the remaining Azure configuration; no production `.env` file is needed.

| Variable                       | What you supply / where to find it                                                                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ASSISTANT_API_TOKEN`          | New random secret, at least 32 characters. Generate locally, for example `openssl rand -hex 32`. Save the same value in Azure Container Apps Secrets and LiveKit agent Secrets. Never put it in the prompt or browser. |
| `ENTRA_TENANT_ID`              | Directory (tenant) ID of your Entra tenant.                                                                                                                                                                            |
| `ENTRA_OWNER_OID`              | Your **user object ID in that tenant**, not an email, subscription ID, or app object ID. Only this user can use page APIs.                                                                                             |
| `ENTRA_API_AUDIENCE`           | Backend API app registration's Application (client) ID UUID. Configure v2 access tokens; the `aud` claim must match this value.                                                                                        |
| `ENTRA_SCOPE`                  | Exposed delegated scope name, normally `access_as_user`. Not the full URI.                                                                                                                                             |
| `ENTRA_SPA_CLIENT_ID`          | Separate source-page SPA app registration's Application (client) ID. Public client: no client secret.                                                                                                                  |
| `STORAGE_ACCOUNT_URL`          | `https://YOURACCOUNT.blob.core.windows.net`. No SAS or account key.                                                                                                                                                    |
| `STORAGE_CONTAINER`            | Existing private container name, for example `assistant`.                                                                                                                                                              |
| `AZURE_CLIENT_ID`              | Only for a user-assigned managed identity; omit for system-assigned identity.                                                                                                                                          |
| `ENABLE_AUTH_PROBE`            | Temporarily `true` for the synthetic Builder connection proof, then `false`.                                                                                                                                           |
| `ASSISTANT_API_TOKEN_PREVIOUS` | Optional old token only during a short rotation overlap; remove after LiveKit is updated.                                                                                                                              |

No LiveKit URL/API key is needed by this service: Builder calls it, not the
reverse. There is deliberately nowhere to add Ravelry credentials until read
access is verified. Use your own synthetic PDF or a public recipe URL first.

## Authentication and the existing vault

No provider PATs are required. Azure deployment uses interactive `az login`,
registry publication uses Entra authentication, the running app uses managed
identity for image pulls and Blob Storage, and the management page uses Entra
user access tokens. Registry passwords and storage account keys remain disabled.

The exception is **Builder -> backend**: `ASSISTANT_API_TOKEN` is a random,
long-lived service bearer secret, not a personal access token. Keeping Builder
means retaining this secret; vaulting it protects storage, not authentication.
It authenticates the agent, not the person speaking.

Use the repository's existing Swamp vault named **`default`**, defined under
`vaults/local_encryption/`, as its local store. This is **not Azure Key Vault**.
The tracked YAML contains configuration only; the encryption key and encrypted
values stay in the ignored local `.swamp/` store. Back them up securely: a new
clone does not have the secret. Never copy the local encryption key into the
image, Azure, LiveKit, or source control.

From `assistant/`, check key names only, then generate/store the token **once if
`ASSISTANT_API_TOKEN` is absent**:

```sh
swamp vault list-keys default --repo-dir .. --json
# Only if the key is absent; do not rerun this for ordinary deployments:
(set -o pipefail; openssl rand -hex 32 | \
  swamp vault put default ASSISTANT_API_TOKEN --repo-dir .. --json)
```

Generation is piped directly into the vault; only metadata is printed. Do not
paste a token into chat or put its literal value in a command, parameter file,
or `.env` file. The deployment instructions below retrieve it into a temporary
process environment without displaying it. Container Apps and LiveKit still need
their own runtime secret copies; neither can read your local vault.

## Azure deployment with Bicep

Deployment is **bootstrap → publish image → deploy service**. Bicep does not
build Docker images, register Entra apps, grant consent, or configure LiveKit.

| File                               | Purpose                                                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `infra/main.bicep`                 | Create a Basic Container Registry, private Blob container/storage account, user-assigned managed identity, scoped role assignments, and Consumption Container Apps environment. No running service or secret is required yet. |
| `infra/service.bicep`              | Reapply the same infrastructure, then deploy the published image, secret-backed configuration, HTTPS ingress, health probes, and scale from zero to one replica.                                                              |
| `infra/service.example.bicepparam` | Copy to ignored `service.local.bicepparam`; replace the three dummy UUIDs and image tag. Read the token from the deployment process environment.                                                                              |

The identity receives **AcrPull only on the new registry** and **Storage Blob
Data Contributor only on the assistant container**. Using a user-assigned
identity lets these assignments exist before the first private image pull.
Registry admin credentials, shared storage keys, and anonymous Blob access are
disabled. The service uses managed identity, not a storage connection string.

### Prerequisites and personal Microsoft accounts

Use Swamp, `jq`, a recent Azure CLI with `az bicep install`, Docker
Desktop/Buildx, and an Azure public-cloud subscription in a region supporting
Container Apps Consumption. The deployer needs resource creation **and
role-assignment** permissions in the group: for example Owner, or Contributor
plus Role Based Access Control Administrator. Contributor alone is insufficient.
Image publication also needs registry push access (for example AcrPush).
Register the `Microsoft.App`, `Microsoft.ContainerRegistry`,
`Microsoft.Storage`, and `Microsoft.ManagedIdentity` providers under the
subscription's Resource providers page if not registered.

A personal Microsoft account (MSA) is fine for Azure, but every subscription
still uses an Entra directory. Use **that directory** for app registrations and
your authorized user object ID, not the consumer-account tenant ID. Your account
must be present there and allowed to register apps; Azure subscription ownership
does not automatically grant directory permissions. If the directory cannot
issue a token for your account, resolve membership/sign-in policy before private
use. Do not switch to `common`/`consumers` or remove issuer/owner validation.

Entra registration remains separate from the Azure Bicep deployment because the
[Graph Bicep applications reference](https://learn.microsoft.com/en-us/graph/templates/bicep/reference/applications?view=graph-bicep-1.0)
states that personal-account permissions cannot deploy Graph Bicep resources.
This does not require a corporate tenant or change the service's authentication.

The portal instructions below work for the one-time setup. For separate Graph
provisioning, this repository's `extensions/models/entra_public_application.ts`
extends `@dougschaefer/azure-ad-app-registration` with
`configurePublicApplication` and `ensureEnterpriseApplication`. It requires the
installed `@dougschaefer/azure` extension, verifies the active tenant, and never
creates client secrets or grants tenant-wide consent.

### 1. Register the two Entra apps once

In the subscription's directory:

1. Register a **single-tenant backend API** app. Under Expose an API, use
   `api://<API Application (client) ID>` and expose delegated `access_as_user`.
   Set the API manifest's `api.requestedAccessTokenVersion` to `2`.
2. Register a separate **single-tenant SPA**. Add delegated permission for the
   API's `access_as_user` scope and grant consent as required by the directory.
   Add its deployed redirect URI in step 5, once known.
3. Save both **Application (client) IDs** and your user's **Object ID in this
   directory** from Entra Users. The latter may be a directory-local guest
   object for your personal account. Do not use an email address, app object ID,
   or user ID from another directory.

When using Graph rather than the portal, also create each registration's local
enterprise application (service principal). The Swamp
`ensureEnterpriseApplication` method does this without creating credentials. A
missing API service principal causes Microsoft sign-in error `AADSTS650052`.

### 2. Bootstrap Azure resources

Run these Bash commands from the repository root, replacing the subscription and
region. They create billable resources; compiling templates does not.

```sh
cd assistant
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
RESOURCE_GROUP=recipe-reader
LOCATION=westus2
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
az deployment group what-if --resource-group "$RESOURCE_GROUP" \
  --template-file infra/main.bicep
az deployment group create --resource-group "$RESOURCE_GROUP" \
  --name assistant-infra --mode Incremental --template-file infra/main.bicep
```

Names are generated deterministically from the group and
`namePrefix=recipe-reader`. Keep the group, prefix, and location unchanged for
updates. If you override the prefix/location here, add the same overrides to the
service parameter file. Use a new dedicated storage account, not an existing
shared account with backup or immutability policies.

The templates disable Blob versioning, soft delete (blob and container), change
feed, and point-in-time restore so source deletion has the intended meaning.
**Do not enable snapshots, backups, object replication, or immutability later
without revisiting retention.** Bicep does not purge historical copies, backups,
or LiveKit records. Storage and registry endpoints are network-public but
authenticated; a private container is not a private endpoint.

### 3. Publish the service image

```sh
REGISTRY_NAME=$(az deployment group show --resource-group "$RESOURCE_GROUP" \
  --name assistant-infra --query properties.outputs.registryName.value -o tsv)
REGISTRY_SERVER=$(az deployment group show --resource-group "$RESOURCE_GROUP" \
  --name assistant-infra --query properties.outputs.registryLoginServer.value -o tsv)
IMAGE_TAG=v1
az acr login --name "$REGISTRY_NAME"
docker buildx build --platform linux/amd64 \
  --tag "$REGISTRY_SERVER/assistant:$IMAGE_TAG" --push .
```

Build **linux/amd64**, including on Apple Silicon; do not deploy an ARM-only
local image. Use a new tag for each build and the same tag in the service
parameters. For build networks needing an npm mirror, add
`--build-arg NPM_CONFIG_REGISTRY=https://YOUR-NPM-MIRROR`; never pass
credentials as build arguments.

### 4. Configure and deploy the service

```sh
cp infra/service.example.bicepparam infra/service.local.bicepparam
```

Edit `infra/service.local.bicepparam`:

| Parameter          | Value to supply                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `imageTag`         | Published tag from step 3, initially `v1`.                                                  |
| `entraOwnerOid`    | Your directory-local user Object ID.                                                        |
| `entraApiClientId` | Backend API Application (client) ID.                                                        |
| `entraSpaClientId` | SPA Application (client) ID.                                                                |
| `enableAuthProbe`  | Temporarily `true` for the synthetic LiveKit proof; restore `false` afterward and redeploy. |

The selected subscription supplies `entraTenantId`; `entraScope` defaults to
`access_as_user`. No account names, container names, or managed identity IDs
need to be copied by hand.

Store the token in the [existing vault](#authentication-and-the-existing-vault)
first. Load it without displaying it, and deploy only if retrieval succeeds. Run
with shell tracing (`set -x`) **off**; tracing would expose assignments.

```sh
if ASSISTANT_API_TOKEN="$(
  set -o pipefail
  swamp vault read-secret default ASSISTANT_API_TOKEN --repo-dir .. --force --json | \
    jq -er '.value | select(type == "string" and length >= 32 and test("^[^[:space:]]+$"))'
)"; then
  export ASSISTANT_API_TOKEN
  DEPLOYMENT_NAME="assistant-service-$(date -u +%Y%m%d%H%M%S)"
  az deployment group what-if --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" --parameters infra/service.local.bicepparam &&
  az deployment group create --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" --mode Incremental \
    --parameters infra/service.local.bicepparam --query properties.outputs
else
  printf 'Vault token retrieval failed; deployment was not started.\n' >&2
fi
unset ASSISTANT_API_TOKEN
```

The parameter file reads the token from the environment, and Bicep marks the
parameter secure. It becomes a Container App secret and never appears in
outputs. Do not use literal tokens in parameter files, `--debug` with secrets,
or compiled parameter JSON containing real tokens. Local parameter files and
generated ARM JSON under `infra/` are ignored by Git.

If identity/role-assignment propagation delays the first image pull or storage
access, wait, then retry with a **new deployment name**. Do not enable registry
admin credentials or storage keys as a workaround. Authorization failures
require the proper role, not repeated retries.

### 5. Finish Entra and LiveKit setup

Outputs include `serviceUrl`, `manageUrl`, and `spaRedirectUri`. Add the exact
**`spaRedirectUri`** to the SPA registration's Authentication page as a
**Single-page application** redirect URI (ends `/manage/redirect`, no trailing
slash). For local login, separately add `http://127.0.0.1:8080/manage/redirect`.
The MSAL v5 redirect bridge must not receive Cross-Origin-Opener-Policy headers
from a proxy. The management page is `/manage/`; that page is not the callback
URI.

Open `manageUrl` and test with synthetic sources. In LiveKit, use `serviceUrl`
as the tool base URL and the same token from the local vault as its
`ASSISTANT_API_TOKEN` Secret. On macOS, copy it without printing it:

```sh
(set -o pipefail
  swamp vault read-secret default ASSISTANT_API_TOKEN --repo-dir .. --force --json | \
    jq -erj '.value | select(type == "string" and length >= 32 and test("^[^[:space:]]+$"))' | \
    pbcopy)
```

Only paste after the command succeeds, and clear the clipboard afterward. The
clipboard temporarily holds plaintext; clipboard history/sync may retain it. Do
not run a bare `read-secret` command that prints the token. Follow the
[Builder setup](#livekit-agent-builder-exactly-what-to-add) below to prove the
secret header and owner-only invocation before private data. Disable the probe
in the parameter file and redeploy afterward.

### Updates, rotation, and costs

For code updates, publish a new image tag, update `imageTag`, and repeat step 4
with the same group and a **unique deployment name**. The revision suffix
derives from that name, so secret-only deployments also create a fresh revision.
Single-revision mode routes to the new healthy revision. Do not reuse deployment
names for changed service settings or manually pin `revisionSuffix`.
Infrastructure-only deployments use Incremental mode and do not remove the app.

For deliberate rotation only, preserve the current vault value under
`ASSISTANT_API_TOKEN_PREVIOUS` before replacing `ASSISTANT_API_TOKEN`. Use a
direct pipe between vault commands with the JSON value filter above and
`pipefail`, not a terminal display or plaintext file. Add this line to the local
parameter file during the short overlap:

```bicep
param assistantApiTokenPrevious = readEnvironmentVariable('ASSISTANT_API_TOKEN_PREVIOUS')
```

Load the previous vault value into that environment variable with the same
guarded read pattern from step 4, using `ASSISTANT_API_TOKEN_PREVIOUS` in place
of `ASSISTANT_API_TOKEN`. Do not proceed if that read fails. Step 4 then loads
the new current vault value. Redeploy with a unique name, update LiveKit from
the vault, then remove the previous-token parameter line and redeploy to stop
accepting the old token. Unset both shell variables afterward, verify rejection
on every serving revision, and delete the retired vault entry when no longer
needed. Editing an Azure secret alone is insufficient.

Compute scales from zero to one replica (0.5 vCPU/1 GiB). **ACR Basic still has
an ongoing charge at zero replicas**, as does stored Blob data. The templates do
not create a database, Key Vault, private endpoint, Log Analytics workspace, or
persisted application-log destination. `/healthz` checks process liveness, not
ongoing Blob availability. Add monitoring deliberately if needed; deployment
does not change LiveKit's retention settings.

## Local development

Install Deno 2.9.6 (or use `npx --yes deno` in place of `deno` below).

```sh
cd assistant
deno task check
deno task test
deno task lint
deno task fmt
deno task build:web
deno task start:env
```

Azure storage mode uses managed identity and is intended for Azure hosting, not
developer account-key authentication. For **synthetic, disposable local smoke
tests only**, set `STORAGE_MODE=memory`, `ALLOW_INSECURE_LOCAL_DEV=true`, and
`HOST=127.0.0.1` in `.env`, plus valid-format Entra IDs and a synthetic service
token. Memory mode rejects non-loopback binding and loses every record at exit.
Real page sign-in still requires actual Entra registrations; there is no auth
bypass. Production defaults to Azure storage and fails on missing configuration.

The browser bundle is generated in ignored `dist/`. Rebuild after editing
`web/app.ts`. All private APIs use bearer tokens; there is no cross-origin API
support. Static assets contain no secret or source data.

## LiveKit Agent Builder: exactly what to add

Use the existing agent's **open-ended conversation** mode and logged-in **Live
preview**, not a public embed, share link, telephony endpoint, or
data-collection summary as a substitute for saving progress. Do not enable
public access.

### Secrets and initial connection proof

In that agent's Secrets, add `ASSISTANT_API_TOKEN` with the same secret used by
the backend. Under **Actions → HTTP tools**, add a temporary tool:

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Name         | `check_connection`                                                          |
| Description  | Check the synthetic backend authentication probe. No user data is returned. |
| Method       | `GET`                                                                       |
| Endpoint     | `https://YOUR-SERVICE/v1/auth-probe`                                        |
| Header name  | `Authorization`                                                             |
| Header value | `Bearer {{secrets.ASSISTANT_API_TOKEN}}`                                    |
| Silent       | **Off**                                                                     |

Set `ENABLE_AUTH_PROBE=true` in the backend, ask Live preview to check the
connection, and require `{"authenticated":true,"syntheticOnly":true}`. A missing
or wrong token must fail. Confirm only you can invoke the agent: the service
token authenticates **the agent, not the speaker**. A logged-in dashboard alone
does not prove there is no other dispatch/share/embed path. If owner-only
invocation cannot be established, stop before private data and revisit per-user
voice authentication. Check LiveKit transcript/tool-result retention too; lack
of a preview session in observability is not evidence that no data is retained.
Remove the probe tool and disable `ENABLE_AUTH_PROBE` afterward.

### Conversation tools

Add the following HTTP tools. Replace `BASE` with `https://YOUR-SERVICE`.
**Every tool** gets the same secret-backed `Authorization` header above, Silent
**off**, and JSON `Content-Type: application/json` for POST bodies. Builder uses
`:id` path parameters (not OpenAPI's `{id}` notation). Add `id` and `followUpId`
as required string path parameters wherever present. Do not put them in the JSON
body. All listed body fields are required; revision is an integer; array items
are strings. Use `[]` for no consequences or follow-ups.

| Tool name and description                                                                                                | Method and endpoint                                         | JSON body parameters                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `get_state`: Resume the selected project and its last explicit report.                                                   | `GET BASE/v1/state`                                         | None                                                                                                                         |
| `list_projects`: Find saved assistant projects without switching selection; clarify ambiguous matches.                   | `GET BASE/v1/projects`                                      | None                                                                                                                         |
| `get_project`: Read an older project's notes without selecting it.                                                       | `GET BASE/v1/projects/:id`                                  | None                                                                                                                         |
| `create_project`: Create assistant notes, never a Ravelry project. Does not select it.                                   | `POST BASE/v1/projects`                                     | `title` string                                                                                                               |
| `select_project`: Switch only when the user chooses this project.                                                        | `POST BASE/v1/projects/:id/select`                          | None (`{}` is fine)                                                                                                          |
| `get_source_text`: Read the entire source of the active project before giving instructions.                              | `GET BASE/v1/projects/:id/source-text`                      | None                                                                                                                         |
| `save_progress`: Save only explicit completion reports or corrections, never questions or instructions read aloud.       | `POST BASE/v1/projects/:id/progress`                        | `expectedRevision` integer, `location` string, `report` string                                                               |
| `save_modification`: Save a user-directed instruction change independently from progress; dependent work starts pending. | `POST BASE/v1/projects/:id/modifications`                   | `expectedRevision` integer, `location` string, `change` string, `consequences` string array, `pendingFollowUps` string array |
| `complete_follow_up`: Mark only this explicitly reported dependent change applied.                                       | `POST BASE/v1/projects/:id/follow-ups/:followUpId/complete` | `expectedRevision` integer, `report` string                                                                                  |
| `complete_project`: Only after explicit user confirmation; retains notes but removes stored source content.              | `POST BASE/v1/projects/:id/complete`                        | `expectedRevision` integer                                                                                                   |

For `save_modification`, for example:

```json
{
  "expectedRevision": 2,
  "location": "first sleeve",
  "change": "Shorten the sleeve by two rows",
  "consequences": ["Recalculate increase-row spacing with the user"],
  "pendingFollowUps": ["Apply the same shortening to the second sleeve"]
}
```

If the Builder UI cannot express string arrays or preserve the full source tool
result, stop and record that limitation; do not silently flatten, truncate, or
replace full-document context with guesses. `openapi.yaml` is the canonical API
contract for parameter shapes, responses, and errors; these are manual HTTP tool
entries, not a promise of an OpenAPI import feature.

**Do not add** PDF upload, URL import, deletion, or any generic fetch tool to
Builder. Do not add the disabled Ravelry endpoints yet. No MCP server is
exposed. Leave the end-of-call summary endpoint unset; summaries do not
authorize saves.

### Instructions and greeting

Paste `builder-instructions.txt` into Builder's **Instructions**. In the welcome
greeting instructions use: “Call get_state before naming a project. State its
title and last user-reported location, invite correction, and ask what the user
wants next. If there is no active project, ask them to choose one.” Do not
hardcode a real pattern, private project, service token, or API credential into
either field.

### First session

Sign in at `/manage/`, create a synthetic project, attach a supported synthetic
PDF or public URL, then click **Use for voice conversation**. In Live preview
ask to resume, read the next instruction, save an explicit progress correction,
and record a sleeve modification with an unfinished matching-sleeve follow-up.
Start a new session and check the distinction survives. Looking up another
project must not select it. Mark completion only explicitly: it deletes the
source.

## Limits and failure recovery

- Sources: 25 MiB PDF, 1–60 text-readable pages, or 2 MiB uncompressed UTF-8
  HTML; at most 100,000 extracted characters. The character cap is not proof of
  fit in your selected model's context. Verify the entire tool result is
  available.
- PDF extraction rejects drawings/images and obvious separated columns; it does
  not perform OCR or understand arbitrary layout. HTML text extraction rejects
  obvious login/script-only pages but cannot prove every site's recipe is
  complete. Treat extracted text as untrusted source data, inspect synthetic
  examples, and ask for another source if context/layout is ambiguous. A stored
  snapshot is not independent semantic verification of all source instructions.
- Backend HTTP tools require the selected project for source reads and writes.
  Reads/listing do not switch projects. Only explicit selection changes it.
  Single-owner concurrent sessions are not supported as independent workspaces;
  avoid simultaneous calls or selection changes while another session is saving.
- `409 revision_conflict`: reload the project; reconcile the requested report
  before retrying against its new revision. Never blindly replay stale writes. A
  network timeout can follow a committed write: reload before retrying so a
  report is not duplicated. Source attach checks a lost commit response before
  deleting staged objects. Uncertain outcomes are errors, never saved claims.
- `partial_completion`: completion notes were saved but cleanup failed. Retry
  `complete_project` using `error.currentRevision`. `partial_deletion`: keep the
  title confirmation and retry deletion with `error.currentRevision`; the page
  keeps this retry information while open. A record being deleted is hidden from
  normal listing; retain its ID and returned revision if doing operational
  recovery.
- Reattachment/replacement is rejected even after completion. Make a new
  project. Notes remain until explicit deletion. No raw HTML, public Blob URLs,
  purchase actions, Ravelry project creation, or Ravelry modifications are
  available.
- Rotate by setting a new current secret and temporarily retaining the old as
  `ASSISTANT_API_TOKEN_PREVIOUS`; deploy/restart **all serving revisions**,
  update LiveKit, then remove the previous secret and roll again. Verify
  old-token rejection. An Azure secret edit alone does not refresh running
  revisions.

Reference:
[LiveKit Builder HTTP tools, secrets, and preview](https://docs.livekit.io/agents/start/builder/).
