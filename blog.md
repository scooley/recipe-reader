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
  source when existing account access does not provide it.

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
- **`ask_user`:** Captured explicit choices for hosting, storage, data
  retention, Entra ID authentication, and a non-voice upload page instead of
  silently making those architectural decisions.
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
- Keep project notes until explicitly deleted; remove the stored PDF when the
  user explicitly marks the project complete.
- Use Microsoft Entra ID user-token validation for the API, not a shared
  Builder secret. The Builder's ability to supply that user's token is an
  unverified prerequisite, not a reason to silently downgrade authentication.
- Add a small upload-focused web page served by the same Deno service. Keep
  voice interaction in Builder Live preview; the page is not a replacement
  voice client and does not resolve Builder tool authentication.

## Notes about persistence

- The user has one active project at a time and wants to turn project notes into
  a blog after the work. They questioned whether a database is necessary.
- Container Apps' local container storage is ephemeral; it is not safe as the
  only copy of project notes or uploaded patterns. Azure Files can be mounted
  persistently, but that adds a file-share mount and concurrency considerations.
- The user selected private Azure Blob Storage for persistence. The proposed
  layout is one Markdown note object per project, separate private PDF objects,
  and a small active-project index. This avoids a database for the current
  small, single-user scope and keeps notes portable, but Blob is object storage
  rather than a local filesystem.
- The user chose to keep notes until manually deleted and delete a project's
  stored PDF when they explicitly mark that project complete. The plan also
  deletes the private extracted-text sidecar so no durable copy of the pattern
  remains. This preserves modification/progress history while freeing the
  source; source-based help after completion may require another upload.
- To make the manual-deletion choice actionable, the draft adds a page-only
  project-delete operation. The user must type the project title to confirm;
  the operation is not exposed as a voice tool.
- The user selected Microsoft Entra ID user-token validation for
  Builder-to-backend authentication instead of a shared secret. LiveKit Builder
  documents tool headers backed by secrets and metadata, but the actual Live
  preview's ability to provide a per-user Entra token for the backend has not
  been verified. This is a hard proof-of-concept gate; do not quietly fall back
  to a shared token.
- The user chose a small upload-focused web page served from the same Deno
  service, keeping voice interaction in Builder Live preview. The draft also
  includes explicit, title-confirmed deletion of a project and its stored data
  to honor the user's "keep until deleted" retention choice. The page can
  obtain a user Entra token for its API requests; it does not resolve the
  separate question of how Builder HTTP tools get the user's token.
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
- Blob Storage, the notes/PDF retention rule, and Entra ID user authentication
  are selected. Builder's ability to pass the required per-user token still
  needs proof.
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
- Storage, retention, and backend authentication are selected, but Entra token
  forwarding, Ravelry access, and Live preview data retention still need
  verification.
- Live preview transcript and tool-result retention, full-PDF text extraction,
  reconnection behavior, and save acknowledgments still need checking.

## Current artifact and next work

- Design draft: `specs/personal-voice-assistant/design_draft.md`
- The Overview, Problem, Goals, and Non-Goals sections have been approved.
- The Technical Plan, Alternatives Considered, and Detailed Implementation
  Plan are revised after the user's Ravelry-scope clarification and await
  approval. They identify proposed files/resources, the HTTP contract,
  storage, access checks, error behavior, and verification gates. The upload
  page remains non-voice and has a separate confirmed deletion action;
  deletion is not exposed to Builder.
- No production code, Ravelry account changes, credentials, or deployment work
  have been performed.
