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
- Use a pattern already available in the user's purchased library or a
  user-uploaded file as the source; never buy a pattern for the user.
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
backend—not the prompt—holds Ravelry credentials, validates Microsoft Entra ID
user access tokens, checks that each request belongs to the authorized user,
and coordinates project lookup, source reading, and assistant-side records.
The user selected Entra ID rather than a shared Builder secret. Whether the
Builder Live preview can provide a user token to its HTTP tools is not yet
verified; do not deploy the backend to the Builder or fall back to a shared
secret unless the user approves that change.

The user also selected a small upload-focused web page served by this same
backend. The page uses Entra ID sign-in to upload a PDF to the authorized
project and provides an explicit, confirmed way to delete a project and its
stored data; it does not replace the Builder Live preview for voice
interaction. This gives uploads and deletion a user-authenticated path but
does not solve the separate Builder-to-backend token-forwarding question.

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
   user's account. If existing access is insufficient, use a user-uploaded
   source or stop; do not silently substitute a broader credential or make a
   purchase.
2. **Source reading.** Accept a user-uploaded source or retrieve a selected
   pattern already available in the user's library, if the user's existing
   access permits it. For the first experiment, extract and check the full text
   of the chosen source and provide that checked document as conversation
   context. Do not add a general document index. If extraction is incomplete,
   the source is too large to use as full context, or layout-dependent
   instructions cannot be read reliably, explain the limit instead of filling
   gaps from general craft knowledge.
3. **Assistant records.** Keep writable assistant-owned records separate from
   Ravelry. Store the selected project and its source reference, last
   user-reported progress, and user-directed modifications as distinct
   information. A modification should retain what changed, where it applies,
   and any dependent work the user discusses—for example, changed increase-row
   spacing and the corresponding change on the other sleeve. Do not mark
   progress or a mirrored change complete just because the assistant discussed
   it. Confirm a save only after the backend confirms it.

Persist project records and uploaded source files in private Azure Blob
Storage, not on the Container Apps instance's ephemeral filesystem. Use
Markdown objects for project records and separate objects for source files;
the first version does not need a database. The backend should use the
Container App's managed identity with access limited to the required storage
container. Use Blob ETags with conditional writes so a stale update cannot
silently replace newer project notes; on a conflict, reload and reconcile
before retrying. Keep project notes until the user deletes them. When the user
explicitly marks a project complete, delete its stored PDF copy; the retained
notes remain available, but source-grounded help then requires a new upload or
a verified Ravelry retrieval. The exact Builder-to-backend authentication
path remains subject to a proof of concept: Entra ID user tokens are selected,
but their availability to Live preview HTTP tools is unverified.

The user selected TypeScript/Deno, a backend in this repository, and Azure
Container Apps for hosting. The repository currently contains Swamp
configuration and design artifacts, but no assistant implementation. The
Detailed Implementation Plan below lists the proposed files and Azure
resources, while keeping existing-account Ravelry access and the Entra token
forwarding proof as explicit prerequisites.

### Conversation and data flow

```text
User
  |
  v
LiveKit Agent Builder (Live preview)
  | authenticated, named operations
  v
Personal-assistant backend
  |-- OAuth 2.0, read/download allowlist --> existing Ravelry projects and owned patterns
  |-- checked full-document text -----> selected source
  |-- read/write assistant records ---> private Azure Blob Storage
  |
  v
Answer tied to the selected project, source, and relevant section
```

At the start of a session, the agent retrieves the last active project and its
saved progress, names them, and invites correction. When the user describes a
project, the backend searches the user's existing Ravelry projects and, if
permitted, patterns already available in the user's purchased library. The
agent asks which project or source to use when the match is ambiguous. The
user may instead upload a source. The assistant reads the selected source as a
whole and answers from it, keeping follow-up questions attached to the same
project and section.

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
- Confirm Builder-to-backend authentication and that no other caller can invoke
  private source or assistant-record operations. Restrict Blob access to the
  backend's managed identity. Specifically verify that the Live preview can
  supply an Entra ID access token for the backend API, and that the backend can
  validate its issuer, audience, scope, and authorized user identity. Do not
  treat Builder metadata or a user ID in the request body as proof of identity.
- Verify the upload page can sign in the authorized Entra ID user, obtain a
  token for the backend API, and upload a synthetic PDF without exposing Blob
  credentials or a public source URL.
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
- Whether a lookup of an older project changes the active project or only the
  current lookup target.
- Whether interruption/reconnect behavior in Live preview is sufficient.
- Whether a clear progress or modification report is saved immediately with a
  brief acknowledgment, or requires confirmation in any cases.

## Detailed Implementation Plan

The first implementation is limited to the existing Builder Live preview, one
personal TypeScript/Deno HTTP backend in this repository, an upload-focused
page served by that backend, and private Azure Blob Storage. The page supports
source upload and explicit project deletion, but no voice interaction. The
design does not create a new voice client, a public embed, a database, or
Ravelry write capability.
Implementation of personal Ravelry reads remains blocked on verifying the
user's read-only OAuth access. Until that is verified, the backend must support
an explicitly uploaded source and must not substitute a broader Ravelry
credential.

### In-repository files

| File | Purpose |
| --- | --- |
| `assistant/deno.json` | Pin Deno tasks and runtime dependencies for the backend. Keep dependency versions explicit and commit the lockfile. |
| `assistant/deno.lock` | Make backend dependency resolution reproducible. |
| `assistant/src/main.ts` | Start the HTTP server, serve the upload page and static assets, register the named assistant operations, validate inputs, authenticate callers, and map errors to explicit responses. |
| `assistant/src/auth.ts` | Validate Entra ID bearer tokens for the configured tenant, backend audience, required API scope, and one authorized user; never trust a user identifier supplied only in a request body. |
| `assistant/src/storage.ts` | Read and conditionally write private Blob objects using the Container App managed identity; expose no public Blob URLs. |
| `assistant/src/projects.ts` | Implement project selection, explicit progress saves, separate modification records, correction, older-project lookup without changing the active project implicitly, explicit completion, and user-confirmed project deletion. |
| `assistant/src/sources.ts` | Accept an uploaded PDF or an authorized purchased-pattern download up to 25 MiB, extract and check full-document text, and store private source copies only when permitted. Support transient processing when persistence is not permitted; delete stored source copies on explicit project completion and report unsupported, incomplete, oversized, or unusable input. |
| `assistant/src/ravelry.ts` | Implement only verified reads of existing projects and downloads of patterns already in the user's purchased library. Keep credentials server-side and allowlist methods and destinations. Do not create or modify Ravelry projects or make purchases; do not enable until account access is verified. |
| `assistant/src/assistant_test.ts` | Test authorization, project-state separation, ETag conflicts, upload/deletion failures, source-extraction failures, and the no-write/no-purchase Ravelry boundary using synthetic fixtures. |
| `assistant/openapi.yaml` | Define the exact HTTP tool contract, request/response shapes, authentication requirement, and non-success responses for Builder and the upload page. |
| `assistant/public/index.html` | Provide the minimal source-management page for upload and explicit project deletion; it does not host voice conversation. |
| `assistant/public/app.js` | Sign in with Entra ID, obtain a backend API access token, upload a selected PDF, and request project deletion after an explicit confirmation. |
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
- One Azure Storage account with a private Blob container for source PDFs and
  project records. No anonymous/public access. Keep source objects and project
  Markdown under distinct prefixes. Keep notes until user deletion; delete a
  project's PDF and extracted-text copy only when the user explicitly marks
  that project complete.
- One single-tenant Entra ID app registration representing the backend API,
  with a delegated scope for authenticated assistant operations and only the
  user's account authorized.
- One single-tenant Entra ID SPA registration for the upload page, configured
  with the page's redirect URI and permission to request the backend API scope.
  Keep the SPA registration separate from the API registration.
- A system-assigned Container Apps managed identity with the minimum Blob data
  role scoped to the assistant's container. Do not put an account key in
  Builder configuration or source control.
- Store only non-secret resource identifiers (for example, storage account,
  container name, Entra tenant, audience, and authorized user object ID) in app
  configuration. Store any Ravelry OAuth secret in an approved secret store,
  not in the container image or Builder prompt.
- Do not create a database, Azure Files share, custom domain, public API
  ingress, or production Ravelry integration until required access and
  authentication checks pass. If Builder cannot forward an Entra ID user token,
  stop and ask before considering another authentication scheme. The upload
  page may be built and tested independently with synthetic content. The
  Ravelry integration must not create or modify projects or make purchases;
  it may only use the user's existing project and purchased-pattern access.

### HTTP contract

`assistant/openapi.yaml` is the canonical contract. All `/v1` operations
require an Entra ID bearer token for the backend API; the backend validates
signature, issuer, tenant, audience, expiry, required scope, and the configured
authorized user's object ID. The user identity comes from validated token
claims, never from a caller-controlled project or user field. The upload page
uses the same API with a delegated token. LiveKit Builder must provide an
equivalent user token before its tools are enabled.

| Operation | Behavior |
| --- | --- |
| `GET /v1/state` | Return the active project, last reported progress, and source availability; return an empty state when no project is active. |
| `POST /v1/projects/search` | Accept `{ "description": "..." }` and return matching authorized Ravelry projects only after read access has been verified; otherwise return an explicit `ravelry_unavailable` result. |
| `POST /v1/patterns/search` | Accept `{ "description": "..." }` and return matching patterns already available in the user's purchased library, only after read/download access is verified. Do not search the general catalog or purchase patterns. |
| `POST /v1/projects` | Accept `{ "title": "..." }` and create an assistant-side record with a generated internal ID and optional reference to an existing Ravelry project; this does not create a Ravelry project. |
| `POST /v1/projects/{id}/select` | Explicitly set the active project. Merely looking up an older project does not change it. |
| `GET /v1/projects/{id}` | Return project title, source availability, last progress, modification history, and current revision for the authorized user. |
| `POST /v1/projects/{id}/source` | Accept a PDF up to 25 MiB as multipart field `file`, store it privately, extract and check it, and save the text sidecar before reporting the source usable. Reject non-PDF input and report size/extraction failures without claiming a usable source. |
| `POST /v1/projects/{id}/source/ravelry` | Accept `{ "patternId": "..." }`; verify it is available in the authenticated user's purchased library before retrieving it. Persist the PDF and extracted text only if the user's existing access and applicable terms permit it; otherwise process transiently for the current session or require upload. This operation cannot purchase a pattern. |
| `GET /v1/projects/{id}/source-text` | Return the checked private text sidecar only when the caller is authorized and the source exists. Never return a Blob URL. |
| `POST /v1/projects/{id}/progress` | Accept `{ "expectedRevision": n, "location": "...", "report": "..." }`; save an explicit report or correction as progress with a timestamp. Do not infer completion from questions or assistant speech. |
| `POST /v1/projects/{id}/modifications` | Accept `{ "expectedRevision": n, "location": "...", "change": "...", "consequences": ["..."], "pendingFollowUps": ["..."] }`; save separately from progress and track dependent work as pending until explicitly reported applied. |
| `POST /v1/projects/{id}/complete` | Accept `{ "expectedRevision": n }`; mark the project complete, retain its Markdown history, and delete its stored PDF and extracted-text sidecar. Return a partial-failure result if the note update succeeds but either Blob deletion does not. |
| `POST /v1/projects/{id}/delete` | Page-only operation, not exposed as a Builder tool. Accept `{ "expectedRevision": n, "confirmTitle": "..." }`; require an authenticated user and an exact title match. Delete the project Markdown, PDF, text sidecar, and active-project pointer if it references this project. Report partial deletion failures and permit safe retries. |

Use `400` for invalid input, `401` for missing/invalid tokens, `403` for an
unauthorized user, `404` for an unknown project/source, `409` for an ETag
conflict, `413` for a PDF over 25 MiB, `422` for unreadable or incomplete PDF
content, and `5xx` for unavailable storage or extraction infrastructure. Do
not return success-shaped fallbacks. Each tool response must make clear
whether the requested change was saved.

Successful state reads and writes include the current project `revision`.
Writes require the revision last observed by the caller; the backend also uses
the corresponding Blob ETag in its conditional write. A mismatch returns `409`
with the current revision and does not overwrite the record.

The source-management page provides sign-in, project selection or creation,
PDF selection, upload progress, and project deletion. Deletion requires the
user to type the project title into a confirmation prompt. The page does not
host voice interaction or expose project notes/source text; all calls still
pass through the authenticated API. The project deletion operation is not
configured as a Builder tool.

### Initial data layout and request behavior

- Store one Markdown record per assistant-side project under a stable internal
  ID. Keep an existing Ravelry project ID as an optional external reference,
  not as the only identifier. Store `projects/{id}/project.md`,
  `projects/{id}/source.pdf`, and `projects/{id}/source.txt` as private Blob
  objects; store the active pointer at `state/active-project.json`. Persist a
  downloaded purchased pattern and its extracted text only if permitted by the
  user's existing access and applicable terms; otherwise use the source
  transiently for the current session or require upload.
- Store a small active-project pointer separately. Opening an older project
  for lookup must not change this pointer; only an explicit user selection
  does so.
- Keep reported progress, discussed modifications, and completion of dependent
  modifications as separate fields or dated entries in the Markdown record.
  Each update must be tied to the authorized user and project.
- Marking a project complete is an explicit user action, not an inference from
  conversation. Retain the Markdown record and delete the stored PDF and its
  extracted-text sidecar so no durable copy of the pattern remains. If source
  deletion fails after the completion state is saved, report the partial
  outcome and retry deletion safely; never say the source was deleted until
  Blob confirms both deletions.
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
2. Verify in the actual Live preview that the configured HTTP tool can send an
   Entra ID access token issued for the backend API. If it cannot, stop without
   deploying an unauthenticated or shared-secret substitute.
3. With synthetic projects and sources, verify missing, expired, wrong-tenant,
     wrong-audience, wrong-scope, and wrong-user tokens cannot read a PDF or
     change a project record.
4. Verify progress and modifications remain distinct, corrections are saved,
   an older-project lookup does not switch the active project, and records
   survive app restart/revision replacement because they are in Blob Storage.
5. Simulate an ETag conflict and confirm the backend reports/reconciles it
   without silently losing either update.
6. Mark a synthetic project complete and verify its Markdown history remains
   while its PDF and extracted-text sidecar are deleted; verify deletion
   failures are reported.
7. Delete a synthetic project from the source-management page and verify its
   note, source objects, and matching active pointer are removed only after
   confirmation.
8. Test PDF extraction for page order, continuation pages, repeated sizes, and
   the sleeve-modification example. Incomplete extraction must block grounded
   answers rather than fall back to unsupported instructions.
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

Storage, retention, and Entra ID authentication are selected. Builder's ability
to supply the required user token, Ravelry access, and Live preview data
retention are verification gates before using real restricted sources.

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

### Defer all Ravelry access and use uploads only

- **Benefit:** The assistant could test source-grounded questions without
  connecting to personal account data.
- **Limit:** It would not test finding the user's projects or purchased
  patterns, which are part of the stated goal.
- **Reason retained only as a fallback:** The first experiment should verify
  whether OAuth can provide the required reads without write permissions. If
  it cannot, use an explicitly uploaded source for the limited trial rather
  than silently broadening access.

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

### Shared Builder bearer secret

- **Benefit:** LiveKit Builder supports secret-backed HTTP-tool headers, so
  this is a low-setup way to authenticate service calls.
- **Limit:** It proves possession of a shared secret, not the identity of the
  user who initiated a call, and anyone able to invoke the agent may inherit
  its access.
- **Reason not selected:** The user chose Entra ID user-token validation. The
  Builder token-forwarding path must be proven before use; do not silently
  replace it with a shared secret.

The [third-party Ravelry client authentication guide](https://github.com/weftmark/ravelpy/blob/main/docs/authentication.md)
describes the `library-pdf` permission as access to purchased PDF downloads and
lists separate write permissions. The [official Ravelry API page](https://www.ravelry.com/api)
redirected to login during this research. These references do not establish the
current permission set for the user's account; the selected OAuth path remains
pending a direct check.
