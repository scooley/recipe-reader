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

## Entra and Azure setup

1. Register a **single-tenant backend API** app. Under Expose an API, use
   `api://<API application client ID>` and expose delegated `access_as_user`.
   Configure the API manifest's `api.requestedAccessTokenVersion` to `2`.
2. Register a separate **single-tenant SPA**. Add the exact SPA redirect URI
   `https://YOUR-SERVICE/manage/redirect` under Authentication (no trailing
   slash). Add delegated permission for the backend's `access_as_user` scope and
   grant consent as required by your tenant. For local sign-in add
   `http://127.0.0.1:8080/manage/redirect` separately. This dedicated MSAL v5
   redirect bridge must not receive Cross-Origin-Opener-Policy headers from
   ingress or a proxy; the management page itself remains `/manage/`. The
   backend checks the owner object ID even if another tenant user can sign in to
   the app.
3. Create an Azure Storage account with anonymous Blob access disabled and one
   private container. Grant the Container App managed identity **Storage Blob
   Data Contributor scoped only to that container**. No storage keys in the app.
   The service verifies the container is private at startup; it does not create
   it.
4. Configure retention **before uploading private sources**: disable Blob soft
   delete, versioning, snapshots/backups, change-feed-based source replication,
   and immutability for this dedicated trial store if completion is to remove
   all retained source copies. Do not enable a policy that preserves deleted
   source copies without revisiting the design. This service deletes current
   objects; it does not purge Azure historical versions, backups, logs, or
   LiveKit records.
5. Build from `assistant/` using `docker build -t YOUR-REGISTRY/assistant:TAG .`
   (optionally `--build-arg NPM_CONFIG_REGISTRY=https://YOUR-NPM-MIRROR` for a
   network requiring an npm mirror; never pass registry credentials as build
   args) and publish the image to your chosen registry. Create a Container App
   with that image, its managed identity, external HTTPS ingress (insecure HTTP
   disabled), target port `8080`, minimum replicas `0`, and maximum replicas `1`
   for the initial single-owner experiment. Configure `/healthz` probes. It is a
   process liveness endpoint; it does not promise that Blob is currently
   reachable.
6. Add the configuration above. Map `ASSISTANT_API_TOKEN` to a Container App
   secret reference, not a literal in a checked-in deployment file. Activate the
   revision and open `https://YOUR-SERVICE/manage/`. Complete the synthetic
   LiveKit probe and invocation-access checks below before attaching private
   data.

Cloud deployment needs your subscription/resource group, region, container
registry, Entra IDs, storage resource names, and permission to create/assign
those resources. No Azure resources are provisioned by this repository.

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
