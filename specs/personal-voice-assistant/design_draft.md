# Personal Pattern and Recipe Voice Assistant

* **Author:** @scooley
* **Status:** Draft
* **Date:** 2026-11-16

## Overview

This design covers a personal voice assistant for following knitting patterns,
crochet patterns, and cooking recipes when the user's hands are occupied. It
should answer questions about the selected source and provide the next
instruction without treating something it has read aloud as completed work.
The first experiment is intended to use the user's existing LiveKit Agent
Builder agent and its logged-in Live preview, not a new application.

The assistant should resume the most recent project by default, say which
project and last reported area it found, and invite correction. The user should
also be able to describe an in-progress Ravelry project and have the assistant
find it or ask for clarification when more than one project matches. The brief
also calls for tracking changes discussed to the source instructions, separately
from reported progress. For example, changing sleeve length may require
different spacing between increase rows and applying the same change to the
other sleeve. These project-specific changes should be available later to help
the user recreate the piece. The brief does not yet establish how uploaded
source files or saved project memory will be stored, protected, or retained.

## The Problem

Following a pattern or recipe while knitting, crocheting, or cooking makes it
difficult to handle a screen and keep track of the correct instruction. A
voice assistant can reduce that effort, but a plausible answer from the wrong
section, size, or project can cause the user to do the wrong work. It can also
mislead the user if it records progress that was only discussed, or if it
claims a private source or progress update was saved when that did not happen.

The design therefore needs to keep answers tied to the user's chosen source and
current section, distinguish reported progress from instructions read aloud,
track user-directed changes to the source along with their consequences, and
make failures to retrieve source text or save an update clear. Losing a
modification such as changed sleeve shaping can make it difficult to finish the
other side consistently or recreate the piece later. Finding a project on
Ravelry is not proof that the assistant can access its full pattern. The first
version must keep that project lookup separate from access to an uploaded or
otherwise restricted pattern. The available evidence does not yet verify
Ravelry access with the user's account or establish the storage and access
controls for uploads and memory.

## Goals

- Let the user ask hands-free questions about a knitting pattern, crochet
  pattern, or cooking recipe and receive the next relevant instruction.
- Keep each answer and follow-up tied to the selected source and relevant
  section, including continuation text when needed; ask about size only when it
  changes the answer.
- Resume the most recent project with its last reported area, allow the user to
  correct that state, and find an older project when requested.
- Track modifications to a pattern or recipe that the user discusses for a
  project, including relevant consequences such as repeating a sleeve change
  on the other side, so the user can follow and later recreate the modified
  work.
- Find matching in-progress Ravelry projects from a spoken description and ask
  for clarification when the match is ambiguous, subject to verifying the
  required read-only access and fields.
- Use a pattern already available in the user's purchased library, a
  user-uploaded PDF, or a public HTTPS webpage URL entered on the
  source-management page as the source; never buy a pattern for the user.
- Save explicit progress reports separately from conversation or instructions
  read aloud; track discussed source modifications separately from progress;
  and report an update as saved only when storage confirms it.
- Explain missing source text, failed retrieval, ambiguous project matches, and
  uncertain save outcomes without filling gaps with unsupported instructions.
- Keep restricted sources and writable project memory available only to the
  authorized personal user; do not infer source access from project metadata.
- Use the existing LiveKit Builder agent and logged-in Live preview for the
  first experiment rather than requiring a new client or public embed.

## Non-Goals

- Automatically observe or count completed stitches, rows, or cooking steps.
- Support multiple users, public interactive access, or automatic publishing.
- Create or modify Ravelry projects, or make purchases on Ravelry.
- Crawl the general web, build a large document-search platform, or require an
  immediate migration to the LiveKit SDK.
- Fetch arbitrary URLs supplied to a voice tool, access login-only webpages,
  or bypass a paywall.
- Add a custom wake word, offline operation, or broad device support without a
  separate requirement and feasibility check.
- Treat Ravelry project or purchased-library access as the assistant's
  writable memory.
- Treat a discussed modification as completed work, or assume a modification
  to one part of a project has been applied to its matching part.
- Promise uninterrupted listening, specific cost or latency, or a particular
  upload and memory retention policy before those behaviors are tested and
  agreed.

## Technical Plan (Architecture)

### Components and boundaries

The first experiment keeps the existing LiveKit Agent Builder agent and its
logged-in Live preview. The Builder handles the conversation and calls one
personal-assistant backend through named, authenticated operations. The
backend—not the prompt—holds Ravelry credentials and coordinates project
lookup, source reading, and assistant-side records. For the private, single-user
experiment, Builder HTTP tools send a high-entropy bearer token from LiveKit
Secrets; the backend accepts it only on allowlisted voice operations. This
authenticates the agent, not the person speaking. Restrict who can invoke the
agent to the owner and verify that restriction before using private content.
Never treat Builder metadata or a caller-supplied user ID as proof of identity.
The [Builder documentation](https://docs.livekit.io/agents/start/builder/)
supports secret-backed tool headers, but delivery from this Live preview to
the backend still needs an end-to-end test.

The user also selected a small source-management web page served by this same
backend. The page uses Entra ID sign-in to upload a PDF or submit a public
HTTPS webpage **URL** for the authorized project and provides an explicit,
confirmed way to delete a project and its stored data. The backend, not the
browser or Builder, fetches and extracts a submitted webpage; the user does
not paste its HTML or text. The page does not replace Builder Live preview for
voice interaction. It uses a validated Entra ID user token for its API calls.
Never put the LiveKit service token in browser code or accept it on page-only
operations.

The backend has three responsibilities:

1. **Ravelry reads.** Use the user's existing account access to find and read
   existing Ravelry projects and patterns already available in the user's
   purchased library. Expose only named read/download operations; do not
   create or modify Ravelry projects, make purchases, expose a generic
   URL-fetch operation, or give Ravelry credentials to the agent. The exact
   project and library permissions remain unverified: Ravelry's official API
   documentation redirects to login, and available third-party documentation
   identifies `library-pdf` for purchased-PDF downloads while giving
   conflicting descriptions of project access. Test the needed reads with the
   user's account. If existing access is insufficient, use an uploaded PDF or
   page-submitted public URL or stop; do not silently substitute a broader
   credential or make a purchase.
2. **Source reading.** Accept an uploaded PDF or a public HTTPS webpage URL
   submitted on the page, or retrieve a selected pattern already available in
   the user's library if existing access permits it. Only the authenticated
   page can submit a URL; the agent has no generic fetch operation. For the
   first experiment, extract and check the full text of the chosen source and
   provide that checked document as conversation context. Do not add a general
   document index. If extraction is incomplete, the source is too large to use
   as full context, or layout-dependent instructions cannot be read reliably,
   explain the limit instead of filling gaps from general craft knowledge.
3. **Assistant records.** Keep writable assistant-owned records separate from
   Ravelry. Store the selected project and its source reference, last
   user-reported progress, and user-directed modifications as distinct
   information. A modification should retain what changed, where it applies,
   and any dependent work the user discusses—for example, changed increase-row
   spacing and the corresponding change on the other sleeve. Do not mark
   progress or a mirrored change complete just because the assistant discussed
   it. Confirm a save only after the backend confirms it.

Persist project records and source snapshots in private Azure Blob Storage,
not on the Container Apps instance's ephemeral filesystem. Use Markdown
objects for project records, separate PDF objects when applicable, and private
checked-text sidecars for PDF or webpage sources. Do not retain raw webpage
HTML, scripts, or images. The first version does not need a database. The
backend should use the Container App's managed identity with access limited
to the required storage container. Use Blob ETags with conditional writes so a
stale update cannot silently replace newer project notes; on a conflict,
reload and reconcile before retrying. Keep project notes until the user
deletes them. When the user
explicitly marks a project complete, delete its stored PDF copy if present and
its checked-text sidecar (including a webpage snapshot). The retained notes
remain available, but source-grounded help then requires a new project with a
source until versioned reattachment is designed. Before enabling Builder
tools with private content, prove that their secret-backed header reaches an
authenticated HTTPS endpoint and that the agent cannot be invoked by another
user.

The user selected TypeScript/Deno, a backend in this repository, and Azure
Container Apps for hosting. The repository currently contains Swamp
configuration and design artifacts, but no assistant implementation. The
Detailed Implementation Plan below lists the proposed files and Azure
resources, while keeping existing-account Ravelry access and the LiveKit
service-token proof as explicit prerequisites.

### Conversation and data flow

```text
User
  |
  v
LiveKit Agent Builder (Live preview)
  | named operations, secret-backed service bearer token
  v
Personal-assistant backend
  |-- OAuth 2.0, read/download allowlist --> existing Ravelry projects and owned patterns
  |-- checked full-document text -----> selected source
  |-- read/write assistant records ---> private Azure Blob Storage
  |
  v
Answer tied to the selected project, source, and relevant section

User's browser --> Entra sign-in --> source page (PDF or public HTTPS URL)
                                          | user token
                                          v
                                    same backend
```

At the start of a session, the agent retrieves the last active project and its
saved progress, names them, and invites correction. When the user describes a
project, the backend searches the user's existing Ravelry projects and, if
permitted, patterns already available in the user's purchased library. The
agent asks which project or source to use when the match is ambiguous. The
user may instead upload a PDF or submit a public webpage URL on the page. The
assistant reads the selected source as a whole and answers from it, keeping
follow-up questions attached to the same project and section. Webpage text is
untrusted source material, not instructions to the assistant or backend.

When the user reports progress, the backend saves it as progress. When the
user changes the source instructions, the backend saves a separate
modification record and its discussed consequences. If a change must be
repeated on another part, the assistant tracks that as unfinished until the
user reports it applied. Looking ahead or asking a question does not change
progress. The assistant confirms either kind of update only after a confirmed
save.

### Checks before relying on the experiment

- Verify that the user's existing Ravelry access can read project details and
  find/download a pattern already in the purchased library, without granting
  project-write or purchase operations. The current evidence does not establish
  those exact permissions.
- Confirm that a secret-backed `Authorization: Bearer` header reaches the
  backend from Live preview, that missing or incorrect tokens cannot invoke
  voice operations, and that the LiveKit agent cannot be invoked by anyone
  else. A service token does not establish end-user identity. Restrict Blob
  access to the backend's managed identity; do not treat Builder metadata or a
  user ID in the request body as proof of identity.
- Verify the source page can sign in the authorized Entra ID user, obtain a
  token for the backend API, upload a synthetic PDF, and submit a public HTTPS
  URL without exposing Blob credentials or a public source snapshot.
- Verify the URL fetcher cannot reach private, loopback, link-local, metadata,
  or otherwise non-public addresses (including through DNS changes), and
  cannot follow redirects. Test a synthetic public HTML recipe and a pattern
  page; report unusable, login-only, or script-rendered pages rather than
  claiming their content was checked.
- Check how Live preview records transcripts and tool results before using a
  restricted pattern. Begin with original synthetic patterns and two project
  records; use the real pattern only after access and retention boundaries are
  understood.
- Test extraction and full-document use against a representative PDF, including
  continuation pages, repeated size instructions, and the user's sleeve-change
  example. If the whole source cannot be checked or used, report that rather
  than silently switching retrieval strategies.
- Test that progress survives a new session, modifications remain separate
  from progress, corrections replace prior reports, and an older-project
  lookup cannot redirect a save without the user's choice.

### Decisions still open

- Which existing Ravelry permissions and endpoints support project reads and
  access to patterns already in this account's purchased library.
- How to replace or reattach a source without attributing saved progress and
  modifications to the wrong version; the first trial rejects reattachment.
- Whether a lookup of an older project changes the active project or only the
  current lookup target.
- Whether interruption/reconnect behavior in Live preview is sufficient.
- Whether a clear progress or modification report is saved immediately with a
  brief acknowledgment, or requires confirmation in any cases.

## Detailed Implementation Plan

The first implementation is limited to the existing Builder Live preview, one
personal TypeScript/Deno HTTP backend in this repository, a source-management
page served by that backend, and private Azure Blob Storage. The page supports
PDF uploads, public HTTPS URL entry, and explicit project deletion, but no
voice interaction. The design does not create a new voice client, a public
embed, a database, or Ravelry write capability.
Implementation of personal Ravelry reads remains blocked on verifying the
user's read-only OAuth access. Until that is verified, the backend must support
an uploaded PDF or page-submitted public URL and must not substitute a broader
Ravelry credential. Login-only webpages are outside this first implementation.

### In-repository files

| File | Purpose |
| --- | --- |
| `assistant/deno.json` | Pin Deno tasks and runtime dependencies for the backend. Keep dependency versions explicit and commit the lockfile. |
| `assistant/deno.lock` | Make backend dependency resolution reproducible. |
| `assistant/src/main.ts` | Start the HTTP server, serve the source-management page and static assets, register the named assistant operations, validate inputs, authenticate callers, and map errors to explicit responses. |
| `assistant/src/auth.ts` | Validate the LiveKit service bearer token on allowlisted voice operations and Entra ID bearer tokens for the configured tenant, backend audience, required API scope, and authorized user on page operations. Deny a token used on the wrong operation; never trust a user identifier supplied only in a request body. |
| `assistant/src/storage.ts` | Read and conditionally write private Blob objects using the Container App managed identity; expose no public Blob URLs. |
| `assistant/src/projects.ts` | Implement assistant-owned project listing and selection, explicit progress saves, separate modification records, correction, older-project lookup without changing the active project implicitly, explicit completion, and user-confirmed project deletion. |
| `assistant/src/sources.ts` | Accept an uploaded PDF or an authorized purchased-pattern download up to 25 MiB, or a page-submitted public HTTPS URL. Bound and validate webpage requests and extract checked text without retaining raw HTML or running scripts. Store private source copies only when permitted; support transient Ravelry processing when persistence is not permitted. Delete stored copies and text on explicit completion; report unsupported, incomplete, oversized, or unusable input. |
| `assistant/src/ravelry.ts` | Implement only verified reads of existing projects and downloads of patterns already in the user's purchased library. Keep credentials server-side and allowlist methods and destinations. Do not create or modify Ravelry projects or make purchases; do not enable until account access is verified. |
| `assistant/src/assistant_test.ts` | Test missing/invalid voice and page tokens, cross-use of tokens on the wrong operations, credential rotation, project-state separation and listing, ETag conflicts, upload/deletion failures, source-extraction failures, unsafe URLs and redirects, DNS-to-connection safety, and the no-write/no-purchase Ravelry boundary using synthetic fixtures. |
| `assistant/openapi.yaml` | Define the exact HTTP tool contract, request/response shapes, authentication requirement, and non-success responses for Builder and the source-management page. |
| `assistant/public/index.html` | Provide the minimal source-management page for PDF upload, public HTTPS URL entry, and explicit project deletion; it does not host voice conversation. |
| `assistant/public/app.js` | Sign in with Entra ID, obtain a backend API access token, upload a selected PDF or submit a webpage URL, and request project deletion after an explicit confirmation. |
| `assistant/public/styles.css` | Style the source-management page with accessible labels, progress, confirmation, and explicit success/failure states. |
| `assistant/Dockerfile` | Build and run the Deno service as a non-root container with only runtime files and permissions required by the service. |
| `assistant/README.md` | Document local development, required configuration, Builder tool contract, deployment prerequisites, and verification steps without including secrets. |
| `.gitignore` | Extend existing ignore rules for local environment files, build output, and test uploads if these are not already excluded. |

These are proposed paths, not existing files. The first implementation change
must check repository conventions and existing ignore rules before adding them.
No credentials, personal patterns, or user notes belong in the repository.

### Azure resources and access

- One Azure Container Apps environment and app running the `assistant/Dockerfile`
  image. Start with scale-to-zero and no always-on replica; measure cold starts
  in the Live preview before changing that cost/performance trade-off.
- One Azure Storage account with a private Blob container for source PDFs,
  checked-text snapshots, and project records. No anonymous/public access.
  Keep source objects and project Markdown under distinct prefixes. Keep notes
  until user deletion; delete a project's PDF if present and its checked-text
  sidecar only when the user explicitly marks that project complete.
- One single-tenant Entra ID app registration representing the backend API,
  with a delegated scope for the source-management page and only the user's
  account authorized. LiveKit tools do not request Entra tokens.
- One single-tenant Entra ID SPA registration for the source-management page,
  configured with the page's redirect URI and permission to request the
  backend API scope.
  Keep the SPA registration separate from the API registration.
- A system-assigned Container Apps managed identity with the minimum Blob data
  role scoped to the assistant's container. Do not put an account key in
  Builder configuration or source control.
- One independently generated, high-entropy service token stored only in
  LiveKit Secrets and an Azure Container Apps secret (or an approved secret
  store referenced by the app). Configure Builder HTTP-tool
  `Authorization: Bearer {{secrets.ASSISTANT_API_TOKEN}}`. Never put the token
  in the prompt, page assets, source control, URL, or logs. For rotation,
  temporarily accept old and new tokens, update LiveKit, then revoke the old
  token promptly. To revoke a compromised token, update backend validation,
  deploy a new Container Apps revision or restart existing revisions, and
  verify the old token is rejected on every serving revision; changing an
  Azure secret alone does not update running revisions
  ([Container Apps secrets](https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets)).
- Store only non-secret resource identifiers (for example, storage account,
  container name, Entra tenant, audience, and authorized user object ID) in app
  configuration. Store any Ravelry OAuth secret in an approved secret store,
  not in the container image or Builder prompt.
- LiveKit Cloud must reach the backend over HTTPS, so the Container App needs
  external HTTP ingress in an environment reachable from the internet; internal
  ingress alone will not work. Azure terminates TLS at ingress, and the backend
  rejects unauthenticated API requests. Static page assets contain no private
  data; page-only API operations require Entra user tokens, and voice
  operations require the LiveKit service token. Do not confuse a reachable
  endpoint with an anonymously usable API. See [Container Apps ingress](https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview).
- Do not create a database, Azure Files share, custom domain, or production
  Ravelry integration until required access and authentication checks pass.
  Do not expose private content at ingress before proving the tool header and
  the agent's invocation restriction. The source-management page may be tested
  independently with synthetic content. The Ravelry integration must not
  create or modify projects or make purchases; it may only use the user's
  existing project and purchased-pattern access.

### HTTP contract

`assistant/openapi.yaml` is the canonical contract. All `/v1` operations
require an appropriate bearer token over HTTPS. Voice operations accept only
the LiveKit service token and are bound to the configured single-user workspace,
not to a verified end-user identity. Page-only operations accept only an Entra
ID delegated token; the backend validates signature, issuer, tenant, audience,
expiry, required scope, and the configured authorized user's object ID. Shared
read/select/create operations may accept either token after the corresponding
validation; page identity comes from validated claims, never from a
caller-controlled project or user field. Do not use CORS as an authentication
boundary or expose the service token to the browser.

Voice-only: Ravelry project/pattern search, Ravelry source retrieval, checked
source text, progress, modifications, and explicit completion. Page-only:
PDF upload, webpage URL submission, and project deletion. Shared: state,
assistant-owned project listing, creation, selection, and detail reads. An
otherwise valid token of the wrong kind is rejected with `403`; the service
token can never delete a project, upload a file, or submit a URL. Builder must
not be configured with page-only operations.

| Operation | Behavior |
| --- | --- |
| `GET /v1/state` | Return the active project, last reported progress, and source availability; return an empty state when no project is active. |
| `GET /v1/projects` | List assistant-owned project IDs, titles, source types, and revisions for page selection or older-project lookup; do not return source text or Ravelry-only records. |
| `POST /v1/projects/search` | Accept `{ "description": "..." }` and return matching authorized Ravelry projects only after read access has been verified; otherwise return an explicit `ravelry_unavailable` result. |
| `POST /v1/patterns/search` | Accept `{ "description": "..." }` and return matching patterns already available in the user's purchased library, only after read/download access is verified. Do not search the general catalog or purchase patterns. |
| `POST /v1/projects` | Accept `{ "title": "..." }` and create an assistant-side record with a generated internal ID and optional reference to an existing Ravelry project; this does not create a Ravelry project. |
| `POST /v1/projects/{id}/select` | Explicitly set the active project. Merely looking up an older project does not change it. |
| `GET /v1/projects/{id}` | Return project title, source availability, last progress, modification history, and current revision for the authorized user. |
| `POST /v1/projects/{id}/source` | Accept a PDF up to 25 MiB as multipart fields `file` and `expectedRevision`, store it privately, extract and check it, and save the text sidecar before reporting the source usable. Reject non-PDF input and report size/extraction failures without claiming a usable source. |
| `POST /v1/projects/{id}/source/url` | Page-only: accept `{ "expectedRevision": n, "url": "https://..." }`. Fetch a public HTTPS webpage on the backend, extract its readable text, and save a private checked-text snapshot plus URL, retrieval time, and content digest in the project record before marking it usable. Never accept page HTML pasted as a substitute, return raw HTML to Builder, or use this as a generic proxy. |
| `POST /v1/projects/{id}/source/ravelry` | Accept `{ "expectedRevision": n, "patternId": "..." }`; verify it is available through the configured user's existing Ravelry grant before retrieving it. Persist the PDF and extracted text only if the user's existing access and applicable terms permit it; otherwise process transiently for the current session or require upload. This operation cannot purchase a pattern. |
| `GET /v1/projects/{id}/source-text` | Return the checked private text sidecar only when the caller is authorized and the source exists. Never return a Blob URL. |
| `POST /v1/projects/{id}/progress` | Accept `{ "expectedRevision": n, "location": "...", "report": "..." }`; save an explicit report or correction as progress with a timestamp. Do not infer completion from questions or assistant speech. |
| `POST /v1/projects/{id}/modifications` | Accept `{ "expectedRevision": n, "location": "...", "change": "...", "consequences": ["..."], "pendingFollowUps": ["..."] }`; save separately from progress and track dependent work as pending until explicitly reported applied. |
| `POST /v1/projects/{id}/complete` | Accept `{ "expectedRevision": n }`; mark the project complete, retain its Markdown history, and delete its stored PDF if present and checked-text sidecar for PDF or webpage. Return a partial-failure result if the note update succeeds but a required Blob deletion does not. |
| `POST /v1/projects/{id}/delete` | Page-only operation, not exposed as a Builder tool. Accept `{ "expectedRevision": n, "confirmTitle": "..." }`; require an authenticated user and an exact title match. Delete the project Markdown, any stored PDF or webpage text, and the active-project pointer if it references this project. Report partial deletion failures and permit safe retries. |

Use `400` for invalid input, `401` for missing/invalid tokens, `403` for an
unauthorized user or wrong caller type, `404` for an unknown project/source,
`409` for an ETag conflict or an attempted silent source replacement, `413`
for a PDF over 25 MiB or HTML response over 2 MiB, `415` for a non-HTML
webpage response, `422` for unreadable or incomplete source content, and
`5xx` for unavailable storage, extraction, or upstream fetch infrastructure.
Do not return success-shaped fallbacks. Each tool response must make clear
whether the requested change was saved.

The URL endpoint is not a general browsing tool. Parse the entered URL once;
allow only HTTPS on port 443 with a public DNS hostname, no userinfo, fragment,
IP literal, or ambiguous URL syntax. Reject any hostname that resolves to
non-public IPv4 or IPv6 addresses and ensure the outbound client connects only
to a validated public address while preserving TLS certificate validation for
the original hostname.
A separate unchecked DNS lookup at connection time defeats that check; if the
client cannot enforce this, do not enable URL fetching. Reject redirects,
never send cookies or credentials or load subresources, and bound
time, decompressed HTML size (2 MiB), and checked-text context size. Do not
execute scripts. A login wall, JavaScript-only recipe, unsuitable content type,
non-success upstream response, or incomplete extraction makes the source
unusable, not partially trusted.
Treat webpage text as untrusted data rather than instructions; never log the
full URL or return its query string in tool responses. Do not bypass site
access restrictions. See [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

Successful state reads and writes include the current project `revision`.
Writes require the revision last observed by the caller; the backend also uses
the corresponding Blob ETag in its conditional write. A mismatch returns `409`
with the current revision and does not overwrite the record.

The source-management page provides sign-in, assistant-owned project listing,
selection or creation, PDF selection and upload progress, a field for pasting
a public HTTPS URL (not page contents), and project deletion. Deletion
requires the user to type the project title into a confirmation prompt. The
page does not host voice interaction or expose project notes/source text; all
calls still pass through the authenticated API. URL submission and project
deletion are not configured as Builder tools.

### Initial data layout and request behavior

- Store one Markdown record per assistant-side project under a stable internal
  ID. Keep an existing Ravelry project ID as an optional external reference,
  not as the only identifier. Store `projects/{id}/project.md`,
  `projects/{id}/source.pdf` when applicable and `projects/{id}/source.txt`
  for checked PDF or webpage text as private Blob objects; store the active
  pointer at `state/active-project.json`. Keep the submitted webpage URL,
  retrieval time, digest, and source type in the project record; do not retain
  raw HTML or automatically re-fetch a changed page. Persist a downloaded
  purchased pattern and its extracted text only if permitted by the
  user's existing access and applicable terms; otherwise use the source
  transiently for the current session or require upload. Reject a new PDF or
  URL on a project that has ever had a source, even if its copy was deleted on
  completion; use a new project until source-version handling is designed.
- Store a small active-project pointer separately. Opening an older project
  for lookup must not change this pointer; only an explicit user selection
  does so.
- Keep reported progress, discussed modifications, and completion of dependent
  modifications as separate fields or dated entries in the Markdown record.
  Each update must be tied to the validated project and configured single-user
  workspace; only page requests also have a verified Entra user identity.
- Marking a project complete is an explicit user action, not an inference from
  conversation. Retain the Markdown record and delete any stored PDF and its
  checked-text sidecar, or the checked webpage snapshot, so no durable copy of
  the source content remains. If source deletion fails after the completion
  state is saved, report the partial outcome and retry deletion safely; never
  say the source was deleted until Blob confirms every required deletion.
- Deleting a project is a separate, authenticated page action requiring
  explicit confirmation. It removes the project record and all associated
  source objects; if that project is active, clear the active pointer as part
  of the deletion and report any partial failure.
- On read, retain the Blob ETag. On update, write with `If-Match`; if the ETag
  no longer matches, do not claim success or overwrite the newer record.
  Reload, reconcile, and retry only when the update can be applied without
  discarding either version; otherwise report the conflict for user resolution.
- Return extracted source text only for the selected, authorized project.
  Do not persist derived text as public content or expose a generic URL-fetch
  or arbitrary-Blob operation to the Builder.
- A successful save response is the only condition for saying an update was
  saved. Authentication failures, unavailable storage, source extraction
  errors, and write conflicts must have distinct non-success responses.

### Verification sequence

1. Run formatting, type checking, and unit tests for the Deno backend.
2. Before private content, use a temporary, no-data HTTPS probe to verify
   that a Builder HTTP tool sends the configured
   `Authorization: Bearer {{secrets.ASSISTANT_API_TOKEN}}` header from the
   actual Live preview and that only the owner can invoke the agent. The probe
   returns only an authenticated status, never the token or user data. Remove
   it after the check.
3. With synthetic projects and sources, verify missing, incorrect, and revoked
   service tokens cannot invoke voice operations; verify the service token
   cannot upload, submit a URL, or delete projects. Verify missing, expired,
   wrong-tenant, wrong-audience, wrong-scope, and wrong-user Entra tokens cannot
   use page operations or invoke voice-only operations. Rotate the service token and
   verify that the old one stops working on every serving revision without
   logging either value.
4. Verify progress and modifications remain distinct, corrections are saved,
   an older-project lookup does not switch the active project, the page lists
   assistant-owned projects, and records survive app restart/revision
   replacement because they are in Blob Storage.
5. Simulate an ETag conflict and confirm the backend reports/reconciles it
   without silently losing either update.
6. Mark synthetic PDF and webpage projects complete and verify their Markdown
   history remains while their source content is deleted; verify deletion
   failures are reported.
7. Delete a synthetic project from the source-management page and verify its
   note, source objects, and matching active pointer are removed only after
   confirmation.
8. Test PDF extraction for page order, continuation pages, repeated sizes, and
   the sleeve-modification example. Test HTML recipes and pattern pages for
   readable text, rejected redirects/private destinations, and login-only or
   script-only content. Incomplete extraction must block grounded answers
   rather than fall back to unsupported instructions.
9. Verify in Live preview what transcript and tool data are retained. Begin
   with synthetic content; use a real restricted source only after its access,
   retention, and caller-authentication boundaries are confirmed.
10. Test reads of existing Ravelry projects and downloads of patterns already
   in the user's purchased library using the user's existing access before
   enabling the Ravelry adapter. Verify that no project-write or purchase
   method is available.
11. Measure idle and request-time Container Apps charges and cold-start behavior
   before expanding the trial. Do not infer a production cost from a successful
   functional test.

Storage and retention are selected. Service-token authentication for voice
tools and Entra user authentication for the source-management page are
selected; secret header delivery, private agent invocation, Ravelry access,
and Live preview data retention remain verification gates before using real
restricted sources.

## Alternatives Considered

The predecessor brief labels its alternatives as review recommendations, not
user-approved choices. The dispositions below reflect the choices made while
drafting this document and do not claim that untested integrations will work.

### Prompt-only Builder

- **Benefit:** It is the quickest way to try the voice conversation in the
  existing Builder preview.
- **Limit:** A prompt alone does not provide verified source access or durable
  progress and modification records.
- **Reason not selected as the finished design:** It cannot meet the goals for
  source-grounded answers and saved project history. It can still help test
  conversation wording.

### Immediate export to the LiveKit Python SDK

- **Benefit:** It would give the project direct control over tool execution and
  access to SDK-only features and tests.
- **Limit:** It adds code ownership and does not by itself make source
  extraction, project matching, or saved updates accurate.
- **Reason deferred:** The first experiment is set to use the existing Builder
  Live preview. Export should be reconsidered only if a specific Builder limit
  blocks a required behavior.

### Separate HTTP endpoints or a remote MCP service

- **Benefit:** Separate endpoints can limit each capability; MCP can provide
  named tools behind a shared tool interface.
- **Limit:** Separate endpoints require project context to stay consistent
  across calls. MCP adds a service and requires reliable authorization and
  session context.
- **Reason not selected:** The user chose one personal-assistant HTTP backend
  to coordinate project lookup, source reading, and assistant-side records.
  This choice still requires a backend boundary that enforces the personal-user
  limit and keeps Ravelry credentials out of the agent.

### Section retrieval or a general document index

- **Benefit:** Section retrieval can limit the source text sent for each
  question. A general index may help when there are many long documents.
- **Limit:** Section boundaries and links between sections can be missed,
  including a modification that must be repeated elsewhere. A general index
  adds parsing, access, and update work.
- **Reason not selected for the first experiment:** The user chose checked
  full-document context for the initial source. It keeps distant instructions
  available for the sleeve-change example without building an index. If the
  full document is too long or cannot be extracted reliably, the assistant must
  report that limitation; adopting a different retrieval design requires a
  later decision.

### Public-catalog Basic Auth for Ravelry

- **Benefit:** It avoids asking the user for full account access.
- **Limit:** The current third-party client's authentication guide describes
  this credential as public-catalog-only, which does not establish access to
  the user's purchased patterns. Its project endpoint notes and the existing
  access review describe some project reads with this credential, so project
  access evidence is inconsistent.
- **Reason not selected:** It does not establish the needed purchased-pattern
  access. The project list and pattern-library permissions must be tested with
  the user's account instead of assuming this credential covers them.

### Personal Basic Auth key for Ravelry

- **Benefit:** A third-party client describes it as full account access, which
  may reach personal project and library data.
- **Limit:** The same documentation says all OAuth scopes are granted
  automatically. A fixed read-only gateway would restrict the assistant's
  exposed operations, but the credential itself would remain broad.
- **Reason not selected:** The user wants no Ravelry write capability. Prefer
  an OAuth grant limited to verified read permissions; do not fall back to a
  broad key without a separate decision to accept its weaker provider-level
  separation.

### Ravelry as the only project record

- **Benefit:** It reuses project details the user already keeps in Ravelry.
- **Limit:** Ravelry access is not yet verified, and the assistant must save its
  own progress and pattern modifications. A Ravelry read connection cannot
  confirm those assistant-side updates.
- **Reason not selected:** Ravelry is a read-only reference in this design.
  Progress and user-directed modifications belong in a separate
  assistant-owned store.

### Defer all Ravelry access and use user-supplied sources only

- **Benefit:** The assistant could test source-grounded questions with a
  user-uploaded PDF or public URL without connecting to personal account data.
- **Limit:** It would not test finding the user's projects or purchased
  patterns, which are part of the stated goal.
- **Reason retained only as a fallback:** The first experiment should verify
  whether OAuth can provide the required reads without write permissions. If
  it cannot, use an uploaded PDF or page-submitted public URL for the limited
  trial rather than silently broadening access.

### Store notes on the Container Apps filesystem

- **Benefit:** No separate storage resource or Blob API integration is needed.
- **Limit:** Container Apps container storage is ephemeral and can disappear
  when the container shuts down or is replaced.
- **Reason rejected:** It cannot be the only durable copy of project notes or
  purchased patterns.

### Azure Files or a database for project memory

- **Benefit:** Azure Files provides persistent filesystem semantics; a database
  can support structured queries and concurrent updates.
- **Limit:** Azure Files adds share/mount configuration. A database adds a
  service and operational cost that the current one-user, small-record scope
  does not need.
- **Reason not selected:** The user chose private Blob Storage with Markdown
  project records, conditional writes, and no database. Revisit only if
  filesystem access or structured querying becomes a real requirement.

### Separate upload application

- **Benefit:** A dedicated upload app could evolve independently from the
  backend API.
- **Limit:** It adds another deployment and authentication boundary for a
  small upload and project-management flow.
- **Reason not selected:** The user chose an upload-focused page served by the
  same Deno service; voice interaction remains in Builder Live preview.

### Per-user Entra token forwarding from Builder

- **Benefit:** It would identify the caller of each voice tool request instead
  of just the agent.
- **Limit:** LiveKit Builder documents secret-backed headers but not a proven
  way for this Live preview to forward the user's Entra token.
- **Reason deferred:** For this private, single-user experiment the user chose
  a secret-backed service token for Builder tools. Only the upload page uses
  Entra user tokens. The service token is acceptable only if agent access is
  restricted to the owner; revisit end-user authentication before widening
  access.

The [third-party Ravelry client authentication guide](https://github.com/weftmark/ravelpy/blob/main/docs/authentication.md)
describes the `library-pdf` permission as access to purchased PDF downloads and
lists separate write permissions. The [official Ravelry API page](https://www.ravelry.com/api)
redirected to login during this research. These references do not establish the
current permission set for the user's account; the selected OAuth path remains
pending a direct check.
