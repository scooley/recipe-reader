# Blog Notes: Designing a Personal Pattern and Recipe Assistant

Working notes for a future post. This is a record of the design work so far,
not a completed article. Add to it as the design process continues.

## What I wanted to design

- A hands-free assistant for knitting, crochet, and cooking instructions.
- The first experiment uses an existing LiveKit Agent Builder agent and its
  logged-in Live preview.
- The assistant should resume projects, answer from the correct source and
  section, save user-reported progress, and track changes made to a pattern.
- A pattern change is not the same as progress. For example, changing sleeve
  length can change increase-row spacing and require the same adjustment on the
  other sleeve. The notes need to help reproduce the piece later.
- Ravelry should help identify the user's existing projects and patterns
  already available in their purchased library, but the assistant should not
  create or modify Ravelry projects or make purchases. The user can upload a
  PDF or submit a public HTTPS webpage URL when existing account access does
  not provide the source.

## Tools and how they were used

- **Copilot CLI and the EGM drafting skill:** Used the existing concepts brief
  as the starting point, drafted one design section at a time, and used
  approval gates before moving between sections.
- **`view`, `glob`, `rg`, `apply_patch`, and `git`:** Inspected the project
  brief, review, Ravelry access notes, repository instructions, and current
  worktree; edited the design and this running blog note in place.
- **Repository file inspection:** Read
  `specs/personal-voice-assistant/concepts_brief.md`,
  `goldfish_review.md`, and `ravelry-access.md`, along with the design template
  and the repository's `AGENTS.md`. These established the desired behavior,
  prior objections, project-specific access research, and repository rules.
- **`web_search` and `web_fetch`:** Checked current Ravelry authentication
  information. The official API page redirected to login. The third-party
  `ravelpy` authentication guide describes a `library-pdf` permission for
  purchased PDFs and separate write scopes, but its account-access claims need
  verification against the actual Ravelry app and account. Also checked
  Microsoft documentation for Azure Container Apps and App Service to compare
  their Deno-container fit, cold-start behavior, and billing models. Looked up
  Container Apps storage behavior, Azure Blob pricing, Blob ETag concurrency,
  managed identity access to Azure storage, and LiveKit Builder's HTTP-tool
  header/secret and metadata support ([Builder documentation](https://docs.livekit.io/agents/start/builder/)).
  Later checked [Container Apps ingress](https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview)
  for HTTPS reachability, [Container Apps secrets](https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets)
  for rotation behavior, and [OWASP's SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
  before specifying backend fetching of user-supplied URLs.
- **`ask_user`:** Captured explicit choices for hosting, storage, data
  retention, Entra ID authentication, a non-voice source page, and the public
  HTTPS URL scope instead of silently making those architectural decisions.
- **Follow-up discussion:** The user later chose a LiveKit service token for
  voice tools while retaining Entra for page access, and confirmed that public
  webpages are entered as URLs rather than pasted content.
- **Swamp CLI:** Used `swamp help` to verify search command syntax, then
  searched the extension registry and local behavior types for Ravelry and
  HTTP support. There was no Ravelry extension or matching local type. The
  generic HTTP extension result was an endpoint health checker, not a general
  API service.
- **Git:** Checked the worktree before creating the design draft.

## Decisions recorded so far

- Keep the existing Builder Live preview for the first experiment.
- Use one personal-assistant HTTP backend in this repository.
- Target TypeScript/Deno for that backend.
- Host the backend in Azure Container Apps, using the user's MSDN credits for
  eligible charges.
- Use checked full-document context for the first source instead of building a
  section index.
- Use the user's existing Ravelry access to read projects and retrieve
  already-purchased patterns, pending verification of the account's exact
  permissions. The user can upload a source as an alternative.
- Do not create or modify Ravelry projects or make purchases. Keep writable
  progress and pattern modification records in the assistant's own store.
- Treat Ravelry project data and access to an already-purchased pattern as
  separate permissions; one does not prove the other.
- Keep project notes until explicitly deleted; remove the stored PDF and/or
  private checked-text source snapshot when the user explicitly marks the
  project complete.
- Use a secret-backed LiveKit service bearer token for allowlisted voice
  operations and Entra ID user tokens for page operations. The service token
  authenticates the agent, **not** the speaker. Only the owner may invoke the
  agent; a real Live preview header test and access check are still required.
- Add a small source-management web page served by the same Deno service.
  Enter a public HTTPS webpage **URL**, not pasted HTML or page text, for a
  recipe or pattern; the backend fetches and extracts it. PDFs remain essential
  for knitting/crochet. Login-only pages are outside the first trial. Keep
  voice interaction in Builder Live preview; no unrestricted agent URL tool.

## Notes about persistence

- The user has one active project at a time and wants to turn project notes into
  a blog after the work. They questioned whether a database is necessary.
- Container Apps' local container storage is ephemeral; it is not safe as the
  only copy of project notes or uploaded patterns. Azure Files can be mounted
  persistently, but that adds a file-share mount and concurrency considerations.
- The user selected private Azure Blob Storage for persistence. The proposed
  layout is one Markdown note object per project, private PDF objects when
  applicable, checked-text sidecars for PDFs or webpages, and a small
  active-project index. Raw webpage HTML is not retained. This avoids a
  database for the current small, single-user scope and keeps notes portable,
  but Blob is object storage rather than a local filesystem.
- The user chose to keep notes until manually deleted and delete a project's
  stored PDF, if any, when they explicitly mark that project complete. The
  plan also deletes the private checked-text sidecar, including a webpage
  snapshot, so no durable copy of source content remains. This preserves
  modification/progress history while freeing the source; source-based help
  after completion requires a new source.
- To make the manual-deletion choice actionable, the draft adds a page-only
  project-delete operation. The user must type the project title to confirm;
  the operation is not exposed as a voice tool.
- The initial plan selected per-user Entra ID tokens for all API operations.
  The user subsequently chose the simpler secret-backed bearer header for
  Builder HTTP tools, with Entra still required for page operations. LiveKit
  documents the header template, but neither delivery from this Live preview
  nor owner-only agent invocation has been proved. Keep the token only in
  LiveKit Secrets and backend secret storage; revoke at the backend, roll or
  restart serving revisions, and verify rejection. This is service
  authentication, not per-speaker identity or a completed end-to-end test.
- The user initially chose a small upload-focused web page served from the
  same Deno service; it now also accepts public HTTPS URLs. Voice interaction
  stays in Builder Live preview. The draft also
  includes explicit, title-confirmed deletion of a project and its stored data
  to honor the user's "keep until deleted" retention choice. The page can
  obtain a user Entra token for its API requests; Builder uses the separate
  service token, which must never be embedded in the page.
- During plan review, the user clarified the Ravelry boundary: use existing
  project/purchased-pattern access or a user upload; do not create Ravelry
  projects or make purchases. Assistant-owned project notes remain separate.
- Microsoft documents ETags and conditional `If-Match` writes for preventing
  one blob update from silently overwriting another. Container Apps managed
  identity can obtain access tokens for Azure Storage; role assignments can
  limit access to the needed container.
- For the cost comparison, Blob charges depend on capacity, operations, and
  access/tier choices. Azure Files costs depend on the share's billing model;
  its provisioned model charges for provisioned capacity and performance,
  even when not fully used. That makes Blob the likely lower-cost fit for a few
  small objects, though region, redundancy, tier, transactions, and PDF volume
  affect the actual bill.
- Blob Storage, the notes/source retention rule, service authentication for
  Builder, and Entra ID user authentication for the page are selected. The
  service header and invocation restriction still need proof.
- Sources: [Container Apps storage mounts](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts),
  [Blob Storage pricing](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/),
  [Azure Files pricing](https://azure.microsoft.com/en-us/pricing/details/storage/files/),
  [Blob concurrency](https://learn.microsoft.com/en-us/azure/storage/blobs/concurrency-manage),
  [Container Apps managed identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity).

## Azure hosting comparison

- No reliable public statistic was found to compare adoption, so the notes do
  not claim one service is more popular. App Service is older: Microsoft
  announced it in 2015; Container Apps reached general availability in 2022.
- Both can host a custom Linux container for the Deno service.
- Container Apps Consumption can scale to zero and does not charge compute
  while at zero replicas; keeping a warm replica costs more but can reduce
  cold starts. Microsoft lists monthly free resource grants, subject to the
  subscription's eligibility.
- App Service charges for allocated plan instances even while idle. Its
  custom Linux container storage under `/home` must be enabled.
- Container Apps was selected for the design because this is an HTTP container
  with expected quiet periods, but the eventual cost depends on region, warm
  replicas, storage, and request volume. No Azure resource has been created.
- Sources: [Container Apps overview](https://learn.microsoft.com/en-us/azure/container-apps/overview),
  [Container Apps pricing](https://azure.microsoft.com/en-gb/pricing/details/container-apps/),
  [App Service custom-container docs](https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container),
  [App Service cost management](https://learn.microsoft.com/en-us/azure/app-service/overview-manage-costs),
  [App Service launch](https://azure.microsoft.com/en-us/blog/announcing-azure-app-service/),
  [Container Apps GA](https://techcommunity.microsoft.com/blog/appsonazureblog/azure-container-apps-general-availability/3416885).

## Open risks and checks

- Ravelry's official API documentation was not accessible without login.
- Third-party documentation gives conflicting accounts of what read-only
  Basic Auth can read. No request was made with the user's account.
- The OAuth permissions, project fields, and retrieval of patterns already in
  the purchased library still need a bounded test. If existing access cannot
  provide them, use manual upload; do not silently switch to a full-access
  personal key or make a purchase.
- Persist a retrieved pattern and extracted text only if the user's existing
  access and applicable terms permit it; otherwise process it transiently for
  the session or ask for an upload.
- Storage, retention, and backend authentication are selected, but Live
  preview secret-header delivery, owner-only invocation, Ravelry access, and
  Live preview data retention still need verification.
- A page-submitted URL must not become an unrestricted fetch proxy: public
  HTTPS only, validated destination at connection time, no redirects or
  cookies, bounded response size and time, and checked text only. Pages
  requiring login or client-side scripts may not yield usable text.
- Live preview transcript and tool-result retention, full-PDF text extraction,
  reconnection behavior, and save acknowledgments still need checking.

## Further pre-build review

- **Tools used:** Re-read the local design and blog notes with `view` and
  checked the worktree with `git status`. This review identified gaps in the
  proposed contract; it did not test LiveKit, Ravelry, or Azure.
- **Authentication choice resolved later:** At the time of this review, the
  draft required Entra tokens for every call. The user then chose a
  LiveKit-secret-backed service token for voice tools, not for the page. The
  revised draft requires a synthetic Live preview proof before private use.
- **Recipe input resolved later:** The user needs PDFs for knitting/crochet
  and public HTTPS webpages entered as URLs for recipes and some patterns.
  The page submits the URL to a guarded backend fetcher; it does not upload
  pasted HTML. Login-only pages are not in the first experiment.
- **Project selection:** The page needs assistant-owned records, not just
  Ravelry search. The revised contract now lists them through the
  authenticated `GET /v1/projects` operation.
- **Source changes and recovery:** Define what happens when a source is replaced
  after progress or modifications have been saved; those notes should remain
  tied to the correct source version. The draft proposes rejecting reattachment
  in the first trial and using a new project instead. Decide whether Blob
  recovery features or backups are compatible with the promise to delete stored
  source copies on completion, and provide a way to export or restore retained
  notes.
- **Go/no-go examples:** Agree on a small synthetic trial covering ambiguous
  project names, size-dependent instructions, an unfinished mirrored sleeve
  change, a correction, and a failed save before connecting real sources.

## Service implementation resumed (2026-11-17)

- **Copilot CLI session history:** Recovered the prior design decisions after a
  disconnected build, then inspected the uncommitted `assistant/` backend instead
  of recreating or overwriting it.
- **Deno and TypeScript:** Continued the single HTTP service with separate agent
  bearer-token and Entra page authentication, conditional Blob writes, progress
  corrections, separate modifications, pending matching-part changes, and
  completion/deletion cleanup. In-memory storage is explicitly local-only and
  disposable, not the persistence implementation.
- **LiveKit documentation:** Rechecked current Builder HTTP actions, colon-style
  path parameters, secret-backed headers, non-silent results, and preview behavior.
  Added exact tool setup and a ready-to-paste instructions file; this does not
  claim a real Live preview call has succeeded.
- **Source page:** Added a small Entra sign-in page with synthetic-first PDF and
  public-URL ingestion, upload progress, explicit selection, and title-confirmed
  deletion. Used MSAL bundled locally; the service token never reaches the page.
- **Source checking:** Bounded HTTPS import and pinned DNS-to-connection behavior,
  rejected redirects/private addresses, and retained extracted text rather than
  raw HTML. Conservatively rejected image/drawing PDFs and obvious separated
  columns rather than claiming text extraction understands charts. Semantic
  completeness still needs representative source and model-context checks.
- **Failure handling:** Added a regression case for a storage write that commits
  but loses its response: do not clean up source files still referenced by the
  saved project. Tested stale revisions and partial cleanup retries separately.
- **Artifacts:** `assistant/.env.example` identifies the information the owner
  must supply; `README.md`, `openapi.yaml`, and `builder-instructions.txt` document
  deployment boundaries and the Builder configuration without recording secrets.
  No Azure resources were created and no Ravelry account access was attempted.
- **Docker Desktop:** After the owner installed and started Docker, built the
  service image and exercised its actual non-root startup, bearer authentication,
  project/progress APIs, management assets, and MSAL redirect bridge. The smoke
  test used disposable synthetic memory state and removed its container afterward.
  This caught two packaging issues that type checking alone did not: npm cache
  registry consistency and dependency files needing the runtime user's ownership.
  A local npm mirror was needed for the build network; the Dockerfile accepts a
  non-secret registry build argument rather than hardcoding that environment.
- **MSAL v5 documentation:** Verified the dedicated redirect bridge requirement
  and changed the Entra callback configuration to `/manage/redirect`, distinct
  from the source-management page. Real Entra login still needs the owner's app
  registrations; no successful tenant login is claimed by the local checks.

## Prior design-stage handoff (before implementation)

- Design draft: `specs/personal-voice-assistant/design_draft.md`
- The Overview and Problem sections were approved. Goals and Non-Goals were
  originally approved, then updated to include public webpage URLs; the
  revisions await review.
- The Technical Plan, Alternatives Considered, and Detailed Implementation
  Plan were revised after the user's Ravelry-scope clarification. The revised
  Ravelry boundary was approved; the plan is under pre-build review. It now
  specifies separate voice/page authentication and public HTTPS URL ingestion,
  alongside proposed files/resources, storage, error behavior, and
  verification gates. The source page remains non-voice; URL submission and
  confirmed deletion are not exposed to Builder.
- No production code, Ravelry account changes, credentials, or deployment work
  have been performed.
