# Layout-Aware Pattern Working Instructions

* **Author:** @scooley
* **Status:** Phase 1 foundations and offline Phase 2 converter/artifact validation implemented; sandbox/model integration and release checks pending
* **Date:** 2026-11-24
* **Predecessor:** [Concept brief](./concepts_brief.md)
* **Review:** [Consolidated findings](./consolidated_review_report.md)
* **Resolution:** [Major repairs](./goldfish_review_report.md)

## Overview

Create a project from a PDF or supported public webpage without first naming an
empty project. Preserve an immutable, all-size interpretation and its source
evidence. The project's **working instructions** are a view of that reference,
the saved default size, and explicit active additions or corrections. They are
not another rewritten pattern.

Store changes additively. A request to return to the original for a scope sets
aside identified changes; it does not restore an old document version or reverse
physical work. Discuss an unclear scope with the user, including whether they
mean customizations, corrections, or both. Notes and reported progress retain
their existing meanings.

Convert acquired PDFs with heuristic PyMuPDF inside a managed Azure Container
Apps Sandbox with outbound access denied. Use bounded Azure model review and
targeted assistance, not whole-document generative transcription. Voice uses the
active project's reference sections and active changes. Preview shows these
together with original pages and specific unresolved issues.

This is the approved implementation contract. Phase 1 document contracts and
existing-route source-write fencing are implemented. The offline Phase 2 slice
adds a content-agnostic PyMuPDF4LLM/PyMuPDF worker, hash-locked dependencies, an
unbuilt image definition, and injected-reader artifact validation. Fixed paths
and bounds are execution contracts; pattern-specific values are test fixtures,
not converter logic. Managed sandbox/model integration, persisted working
instructions and preview are not implemented. See the
[converter status and unresolved gates](../../assistant/converter/README.md).
No deployment, paid test, license purchase, or sample transmission is authorized.

## The Problem

The current service supports only text-only PDFs and deliberately rejects images,
drawings, and obvious separated columns. Most of the user's patterns contain
inline images, so those restrictions exclude normal input rather than rare
exceptions. Removing the restrictions without changing interpretation would
admit documents the assistant cannot reliably read.

The representative four-page pattern combines photographs, two-column
instructions, eight ordered sizes, size-dependent values, glossary links, and
measurement tables. One instruction section continues from the bottom of the
left column to the top of the right column. A measurement illustration combines
a photograph with arrows and labels. Plain line-by-line extraction can mix
columns, separate values from their sizes, or lose the meaning of the visual.

The user needs coherent sections such as Materials, Yarn, Gauge, Back,
Front-left shoulder, Front-right shoulder, Body, and Neck band, where those
sections exist in the source. These names illustrate the required organization;
they are not a fixed template to impose on every pattern.

A readable transcription can still contain mistakes. The user needs to see
potential issues, compare an instruction with its source, and resolve ambiguity
verbally while working. After choosing a size, the user should not need to work
through every other size in project-specific notes. Later adaptations must remain
distinguishable from the designer's instructions and from reports of work
completed.

## Goals

1. Preserve logical instruction order across columns/pages, all sizes and their
   associations, units, links, and complete visual context.
2. Keep immutable source/reference evidence separate from attributable changes.
   Never silently rewrite the reference or discard an existing customization.
3. Save a project default size, including a validated imported choice, without
   regenerating instructions. Explicit local size choices override that default.
4. Support clear additions, corrections, and scoped return-to-original requests.
   Ask about ambiguous intent or scope; do not infer progress from a change.
5. Provide a preview and verbal clarification without mandatory document-wide
   approval. Withhold known unresolved guidance while leaving unrelated steps usable.
6. Keep reads and writes revision-consistent, retries identifiable, source access
   private, and completion/deletion safe against late writers.
7. Keep preparation request-bound and bounded in time, memory, calls, and cost.
   Preserve saved instructions/notes when preparation fails.
8. Generate a pattern-specific display name plus creation month/year in UTC
   `mmyyyy`. Project UUID, not that potentially repeated name, is identity.
9. Preserve supported text-only PDFs and HTML. Future Ravelry acquisition feeds
   the same source boundary; PDF upload is not mandatory for all projects.

## Non-Goals

* Universal PDF or scanned-document understanding, arbitrary knitting-chart
  decoding, automatic arithmetic repair, or invented missing instructions.
* A knitting-language parser, a rewritten size-specific pattern, a mutable
  merged instruction document, version undo/redo, or selective history replay.
* Interpreting pattern content as permission to invoke tools, change agent rules,
  fetch links, acquire credentials, or change project state.
* A durable conversion queue, background preparation jobs, scheduled cleanup
  agent, shared-source reference counting, or a general importer framework.
* Ravelry authentication/acquisition, a replacement LiveKit client, or changes to
  purchase/access rights. Existing disabled Ravelry routes remain disabled.
* Mandatory preview approval, unvalidated correctness percentages, or whole
  restricted-pattern recitation/export through voice tools.

## Open Questions and Release Gates

No old projects exist, so no migration or lazy-upgrade machinery is needed.
The owner has selected the contracts below. The following are verification
gates, not completed facts or permission to substitute another architecture:

* Applicable PyMuPDF/transitive licenses and distribution obligations.
* Sandbox region/subscription access, SDK/API and Deno compatibility, image
  import, identity/egress isolation, transfer sizes, enforceable execution bounds,
  deletion including source-containing snapshots, and recovery after lost replies.
* GPT-5.4 mini Azure version, Global Standard quota, exact API/settings, identity
  role, current prices, token/image accounting, and optional-storage behavior.
* Grounded guidance accuracy, including plausible errors not automatically flagged.
* Cold/warm end-to-end four-page preview latency, sandbox resources, simultaneous
  voice reads, and actual Builder behavior.
* Full backend monthly envelope below $150, with headroom and the shared $25
  admission-month model allowance. Alerts are not an invoice cap.
* Actual Ravelry size/start-field mapping when its separate importer is built.

## Critical User Journeys

### Create from a source

Given a signed-in owner, PDF bytes or a supported HTML URL are accepted and
prepared in one request. Publish an automatically named project only after its
reference/evidence is consistent. Show upload progress separately from processing.
A lost reply is reconciled using the same attempt, not a new project submission.
Do not automatically select the project for voice.

### Use a default size and active changes

A valid imported default needs no repeated question. Otherwise save it when first
needed for size-dependent guidance, not at upload. General questions remain
available while unset. Read original sections and active additions together;
local size choices take precedence within their explicit scopes.

### Add a correction or customization

Clarify unclear intent/targets, then save an attributable additive record and its
modification summary atomically. Preserve reference text and unrelated changes.
Questions and changes do not count as completed work.

### Return to original for a scope

Identify the changes the user wants set aside. Ask when scope or inclusion of
corrections/customizations is unclear. Deactivate those records, preserving their
attribution until completion; do not restore historical section text. If a
deactivated correction had resolved a known issue, that issue becomes unresolved
again unless another active clarification resolves it. Never silently revive
known-bad guidance or alter reported progress.

### Replace an established default when a new project is required

After starting, or before starting with instruction adaptations, create a
separate project from independently copied reference/source evidence. Keep the
original and its records unchanged. Do not silently transfer progress or
adaptations; clarify ambiguous requested transfers. Return the new identity and
require explicit selection.

### Complete or delete

Close source access and fence writes first. Remove source content, addition
bodies, visuals, sandbox resources and source-containing snapshots. Keep only
notes/progress, bounded modification summaries/follow-ups, and content-free
operational recovery information on completion. Explicit deletion also removes
personal records. Unknown cleanup outcomes remain explicit, not success-shaped.

## Technical Plan

### Immutable reference plus additive changes

The original PDF/checked HTML, raw extraction, and normalized all-size Markdown
are immutable. Companion metadata identifies sections, original line anchors,
page/HTML references, sizes, initial issues, coverage, hashes and converter mode.
A correction is an explicit addition explaining how to read an affected passage,
not an overwrite of the evidence. Keep PDF-byte and extracted-text hashes distinct.

An addition is an immutable instruction record with category `correction` or
`adaptation`, explicit targets, text, actor attribution, and linked modification
summary. Root metadata controls active/inactive status and explicit supersession.
Normal reads join the reference with applicable active records; do not persist a
new authoritative merged pattern. No inverse journal or periodic full snapshots.

An explicit reset deactivates identified records. There is no universal rule to
remove all corrections or always preserve them: resolve the user's actual scope.
A user can make a new explicit change based on an inactive record, but this is
not automatic redo. Preserve unchanged notes/progress.

### Stable scopes and precedence

Use stable original section/line IDs, not heading matching or mutable offsets.
A target is project-wide, whole-section, or an exact passage/value occurrence
within original lines. Repeated text requires a unique line/character occurrence.
Active additions can be referenced by their IDs when the user changes a previous
customization; the new record still declares its original scope.

Nonoverlapping records coexist. A new record that intentionally replaces another
names its superseded IDs; publish its activation and their deactivation together.
Do not silently choose latest timestamp, combine contradictory overlapping
directions, or infer knitting arithmetic. Reject unresolved conflicts with the
conflicting IDs so the agent can clarify intent. Section-wide context can coexist
with a specific instruction if no contradiction is asserted; doubtful applicability
is a clarification issue rather than an automatic overwrite.

Project default is context, not a rewrite. A scoped size adaptation overrides it
only at its specified target; multiple sizes can coexist in one section. Mixed
sizes do not imply compatible fit/stitch arithmetic. An unset default blocks only
dependent guidance unless the requested scope has its own explicit size choice.

### Started status and default changes

For locally created projects, the first saved progress report establishes started,
including setup-only progress. Questions, notes and instruction changes do not.
Imported started/progress status applies immediately. Missing/unrecognized imported
status is unknown, not unstarted; clarify before replacing an established default.

Initialize a missing default even after starting. Replace an established default
in place only before starting with no instruction adaptations. Corrections alone
are not adaptations; saved adaptations count even if later set aside, so a reset
cannot silently reopen the in-place replacement path. All default operations
preserve additions and make no backend model call. New-project replacement uses
independent evidence copying, not reconversion or source sharing.

Future imports may supply validated default/origin/start metadata through internal
preparation. Public callers cannot claim verified Ravelry provenance. Preserve
unknown values pending clarification; do not invent provider field mappings.

### Conversion and assistance

The local comparison already selected `pymupdf==2.1` and
`pymupdf4llm==2.1` with `pymupdf4llm.use_layout(False)`, OCR disabled.
The default layout mode failed reading order despite preserving number counts.
See [comparison](./converter_comparison.md); its local performance is not an
Azure or downstream-guidance measurement. Lock production dependencies and licenses.

Render original full pages, including vector labels/arrows and surrounding text,
not bare photographs alone. Section/page references suffice; no PDF-region
coordinates or crop navigator is required. An illustration-only page can accompany
readable instructions. Scans needing OCR remain unsupported.

Build section candidates from extraction, then perform bounded initial model
review of text/structure and conditional targeted follow-ups. Check ordered line
coverage, all-size values, unit associations, links and references locally.
Model self-review and silence are not correctness guarantees. Keep unreviewed
coverage separate from identified ambiguity. Preserve every original line; page
furniture may be excluded from guidance flow without deleting raw evidence.

Known unresolved passages remain reference material, not usable instructions.
Resolve them from evidence/conversation before guidance; willingness to proceed
alone does not resolve a reading. Unrelated passages remain available. Deactivating
a correction reopens dependent issues; deactivating an adaptation never changes
what work was reported.

### Managed sandbox boundary

Use a fresh Azure Container Apps Sandbox per PDF attempt, not a Python sidecar.
Its image contains only the fixed converter and pinned dependencies. No application
bearer, storage/model token, project volume, exposed port, or runtime Azure identity
is supplied to it. Configure and verify deny-default egress before sending input;
do not rely on a restored image/snapshot to carry networking policy.

Deno uses managed identity and the official `@azure/containerapps-sandbox`
`SandboxGroupClient` data plane. Scope the documented SandboxGroup Data Owner
role to a dedicated group. Runtime does not create/delete groups or grant roles.
Use deployment-time import of a source-free image; no source-containing snapshots,
cross-request sandbox reuse, or per-upload package/model downloads.

Register attempt ownership before create. Use an operation label derived from the
server attempt ID, not a filename/title. On a lost create reply, reconcile that
label and its pending operation; do not create another sandbox blindly. Record
provider resource/poller IDs before input transfer. Transfer bytes/files through
the authenticated data plane; run only a fixed converter command with fixed paths.
Treat all output as untrusted and bounded. Deno alone persists project artifacts.

Delete the sandbox and all attempt-associated snapshots; stopping can retain data.
Keep cleanup receipts until disappearance is confirmed. A failed/uncertain delete
blocks new sandbox preparation under the shared admission record and is visible
to the owner. Request/recovery calls perform cleanup; no background queue is added.
Platform-enforced expiry/termination after controller failure must be verified
before release; a client timeout or advertised idle suspension is not proof.
If the platform cannot meet bounded execution/retention, stop for an owner decision.

See [isolation research](./converter_isolation_research.md) for documented controls
and unverified constraints. A local Docker test is not Azure isolation validation.

### Shared model budget and privacy

Use GPT-5.4 mini as the initial Azure Global Standard candidate, independent
requests, strict structured output, low reasoning initially, and `store: false`.
No tools, remote image URLs, stored conversations, Files API, reserved capacity
or automatic more-expensive fallback. Verify Azure support rather than substitute.
Global Standard can process outside the resource region and outside the US.

Reserve conservative maximum cost in a shared persistent ledger before each call.
The $25 allowance applies across all projects, review/targeted assistance,
model-assisted modifications, evaluation and retries performed by this backend.
Ordinary saving of supplied additions/default choices makes no backend model call.
There are no stage, size, per-page, or project-lifetime dollar caps.

Attribute a call to the UTC month in which its reservation admits it for dispatch.
Retries use their own reservation and their actual admission month; reconciliation
of the original call keeps its original month and ID. If dispatch crosses midnight,
revalidate/reassign an undispatched reservation atomically before sending; never
debit both months. A dispatched request's later settlement stays in its start
month. Unknown usage keeps that reservation there; it does not reduce a future
month's fresh allowance. There is no month-end blackout.

Use integer micro-US-dollars and conditional writes, no assumed cache discounts.
Settle once by call ID; unknown outcomes retain the full maximum. Over-envelope
usage freezes new calls with an accounting error. Exhaustion blocks model calls,
not original reads, notes/progress, supplied additions, resets or default selection.
This limits admitted model work, not Azure's billing-month attribution or invoice.

Standard Azure abuse monitoring is accepted; flagged inputs/outputs can be retained
and reviewed by Microsoft. Disable optional response/conversation/file storage
and application content logging. Disclose this before model-enabled import;
completion cannot promise removal of Microsoft-held monitoring copies. No source
transmission is authorized by approving the design.

### Publication, retries, and cleanup fencing

Use schema 2 for new roots. A hidden preparing project is not selectable/listed.
The root ETag commits reference pointers, addition activation/deactivation,
modification summaries and confirmed operation outcome together. Public revision
increments for visible changes; internal writer registration can change ETag
without changing that revision. All mutations conditionally re-read root state.
An intervening visible notes/edit change causes a stale-operation conflict; no
automatic semantic rebase or repeated paid work.

Before source I/O, durably register the operation and every destination artifact
ID under the root. Reject registration after the source fence is closed. Source
content is never created with an unconditional or create-if-absent payload upload:

1. Create a zero-byte artifact placeholder with create-if-absent.
2. Re-read the registered project's open fence and operation deadline after
   placeholder creation. If closed/missing/expired, never write its content.
3. Upload the immutable content only with the placeholder's exact ETag
   (`ifMatch`). Never refresh that ETag to overwrite a changed object.
4. On an uncertain reply, reconcile the expected hash/operation before publication.
   An absent/different object is not permission to retry against a new ETag.
5. Publish only verified artifacts in one root conditional commit.

Closing the root rejects new registrations and publications first. For every
registered key, conditionally overwrite the current object with zero bytes
(retry a raced ETag only within the cleanup bound), or create an empty fence
object if absent. This invalidates every earlier content-upload ETag. A delayed
content write either preceded that successful fence and is erased, or fails its
condition afterward. Only after sealing may cleanup remove the empty object.

A delayed placeholder create can leave an empty operational marker, but cannot
write source content: its subsequent root check fails. Empty markers/attempt IDs
are content-free recovery metadata, not retained pattern material. Track and
remove them through bounded cleanup retries; report operational cleanup pending
while their outcome is uncertain. Never equate root publication rejection with
source deletion, or rely on prefix enumeration alone for known registered keys.
Use this protocol for old attach routes, preparation, independent copies, and
additive bodies. Source writes bypassing it are prohibited.

Completion reports source cleanup confirmed only after all registered content
keys are sealed/purged and all sandbox/source-snapshot outcomes are resolved.
Otherwise return `partial_completion` and retain identifiers for recovery.
Delete personal records only after safe source fencing; never remove the last
recovery pointer to uncertain external resources. Reads of a closed project's
source are denied even while cleanup remains pending. Copying a source pins the
origin revision and uses the same fences, so concurrent completion cannot produce
a new project from partially deleted evidence.

Receipts contain IDs/hashes/deadlines/outcomes, not source text or names. A
timeout is not proof of failure. Browser attempts use client UUIDs retained in
session storage. Voice retry identity derives from project, original expected
revision, operation kind and canonical payload. Same identity/payload returns the
known outcome or explicit pending/uncertain result; different payload conflicts.
Keep receipts 30 days, longer while cleanup is unresolved.

### Bounded work and availability

| Work | Initial bound and explicit failure behavior |
| --- | --- |
| PDF input | 25 MiB, 1-60 pages, up to 100,000 extracted instruction characters; reject encryption/malformed/unreadable content explicitly. |
| Evidence | 150 DPI, at most 4 million pixels/page and 120 million total; reduce resolution, never clip. PNG at most 8 MiB; conversion artifacts at most 128 MiB. Fail if evidence cannot remain legible. |
| Original document | Up to 200 sections and 200 issues, stable IDs and ordered references; no silent truncation. |
| Additions | Up to 1,000 records, 4,000 text characters each, 64 MiB total source-derived addition data, at most 100 active size overrides. Reject excess, not existing deactivation. |
| Worker | Fixed command; 25-second wall limit and bounded process memory; remote creation/transfer/execution/result/cleanup use the parent deadline. |
| Model call | At most 128,000 conservative input tokens, 8,000 completion tokens including billed reasoning, 10 high-detail page images, 30 seconds. |
| Model attempts | At most 3 per preparation, including at most 1 retry of explicit retryable 429/5xx; no automatic retry after ambiguous network timeout. |
| Parent | 105 seconds through publication/cleanup, browser 120 seconds; reserve at least 10 seconds for persistence/cleanup and shorten/skip attempts that cannot leave it. |
| Concurrency | One shared preparation/copy admission, conditional across revision overlap; reject with 429 and Retry-After rather than queue. Unknown sandbox cleanup keeps admission unavailable. |
| Working reads | Index then 1-4 sections, revision-pinned; additions and notes paged separately in groups of 20; at most 1 MiB serialized response, never silent truncation. |
| Monthly ledger | At most 10,000 reservations/month; explicit full/exhausted/accounting errors; no automatic pruning of uncertain usage. |

Default updates and supplied additions do not consume the preparation slot except
an independent source-copy operation. Notes/reads remain available during model
or sandbox preparation. No new non-cleanup source/model work starts after the
parent deadline; cleanup failure returns recovery state rather than extending
work invisibly. Roughly one minute for a four-page preview is still a target,
not a measured promise. Return to the owner if measurements cannot support it.

### Voice and preview contracts

Preserve `get_source_text` as same-active-project original reference, not a
fallback that ignores additions. Use `get_working_instructions` normally:
section index, then necessary sections/dependencies, default/overrides, project
context, active additions and relevant notes. Reference text can contain
unresolved material and is explicitly not automatically usable guidance.
Return blocked original/addition targets and reasons separately. Do not persist
or serve a model-rewritten guidance document.

All pages identify project/revision. Fetch further addition/note pages before
answering a scope they can affect; do not silently ignore later records. Missing
or corrupt reference/addition data is an error, not permission to use another
project or silently omit adaptations. Voice requires active selection; owner
preview can inspect another project without switching voice.

Preview shows original sections plus clearly attributed active additions, optional
inactive-change history, default/overrides, notes, coverage and unresolved issues.
It does not replace original text in place or certify accuracy. Render text safely
without an HTML-capable Markdown renderer. Authenticated original PNGs use revocable
blob URLs; no bearer in URLs, public Blob link, or remote Markdown image fetch.
Keep at most four page images in browser memory and revoke on switch/sign-out/
completion/teardown. Keep system light/dark and keyboard/status accessibility.

Names use a uniquely identified pattern title, otherwise sanitized filename or
checked webpage title, otherwise `Pattern <short-ID>`, plus UTC creation
`mmyyyy` once. Ambiguous detected titles trigger fallback, not a mandatory naming
question. Page create-from-source does not auto-select. Do not expose a working
Ravelry import control while its routes remain 501.

### End-to-end data flow

```text
Owner page: PDF / supported HTML URL
    -> Deno: validate source, attempt, ownership and admission
    -> PDF only: managed sandbox, denied egress, fixed converter
       -> bounded raw extraction / page evidence -> Deno -> verified deletion
    -> HTML only: existing checked fetch, retained title/links/structure
    -> bounded initial model review
       -> conditional targeted follow-ups within remaining time/budget
    -> immutable all-size reference + metadata + private evidence
    -> conditional root publication of automatically named project

Voice/page explicit changes
    -> current original sections + active additions + default/context
    -> supplied additive record or explicit deactivation (no model regeneration)
    -> conditional root publication + linked modification summary

Completion/deletion
    -> close/register fence -> seal source writes -> remove content
    -> confirm sandbox/snapshot cleanup -> retain only allowed records
       or return explicit partial/uncertain cleanup
```

## Alternatives Considered

| Alternative | Reason not selected |
| --- | --- |
| Remove old PDF rejection checks | Accepts layouts without fixing reading order, size associations or visuals. Preserve supported input behavior through real conversion. |
| Build a custom layout engine | Recreates existing tooling and accumulates pattern-specific rules. The local comparison selected heuristic PyMuPDF; Docling remains an alternative, not a dependency. |
| Whole-document generative transcription / reinterpret every turn | Repeated cost/latency and plausible omissions. Convert once, review bounded evidence, clarify unresolved content. |
| Bare extracted photos / mandatory region coordinates | Photos can lose vector labels; region machinery is not needed for full-page references. |
| Numerical confidence / mandatory preview approval | Neither establishes correctness; use reasons, evidence and targeted conversation. |
| Mutable section replacements, inverse journal, generated size copies | Superseded by owner-approved original reference plus additive changes and explicit scoped deactivation. |
| Automatic latest-wins overlapping changes | Can silently discard intent. Require explicit supersession or clarify conflicts. |
| Python sidecar in the app | Does not establish per-container identity isolation. Owner selected managed sandboxes with denied egress after documented investigation. |
| Separate converter app | Separates identity but does not itself block outbound traffic; adds service authentication/network controls. Not selected. |
| Custom in-process Linux sandbox | Requires maintained syscall/filesystem policies and verified host support. Not selected over managed isolation. |
| Durable background queue or automatic retry job | Owner selected request-bound work; failed measurements require another decision, not a silent switch. |
| Self-hosted or reserved generative model | Adds operations/capacity commitments. Use candidate Azure Global Standard pay-per-token inference. |
| Shared source blobs across knits | Couples ownership/deletion. New default-size projects copy evidence independently. |
| Retain final source/addition bodies on completion | Violates notes-only retention; keep summaries/progress, not an archived pattern. |
| Per-stage or per-project dollar allowances | Owner selected one shared monthly backend model admission allowance. |

## Reconciliation with Earlier Decisions

The concept brief's confirmed Markdown, section, evidence, preview, voice and
verbal-review goals remain. Its other mechanisms were proposals. Later owner
approval supersedes three choices in the first approved design:

* Additive changes replace rewritten working sections, inverse journals,
  checkpoints and latest-version undo. Returning to original is a scoped,
  conversationally clarified deactivation.
* Saving a default no longer generates size-focused text. Original sizes remain
  available; voice uses saved context and explicit scoped additions.
* Managed deny-egress sandboxes replace the same-app Python sidecar.

The new-project default rule, explicit selection, imported size/start boundary,
notes/progress meaning, section-based reads, monthly shared allowance, model
candidate/privacy boundary, and notes-only retention remain. Admission month now
explicitly defines model accounting; no month-end billing guarantee is made.

These approved changes address Major findings; they are not a fresh independent
re-audit. Historical reports describe their reviewed snapshot and retain original
finding IDs and severities.

## Detailed Implementation Plan

Implement in the phases below. Each phase has a stable offline checkpoint; no
phase assumes permission to provision resources. No existing records need
migration. No source replacement/reconversion merge is added. Every production
file to create/modify is listed; no production deletions are required.

### Phase 1: Reference/addition contracts and safe storage

**Create `assistant/src/documents.ts`.** Define runtime-validated immutable
reference/section/line/size/issue/coverage metadata and additive records. Records
carry server UUID, category, explicit original scope, text, optional source-size
choice, clarification attribution, superseded IDs and modification link.
Project/section/passage target is a discriminated union; passage uses existing
line IDs plus start/end character offsets and an exact quote. Reject unknown/
repeated/ambiguous targets and quote mismatches; do not infer reanchoring.
An addition-target reference names an existing addition and must resolve to its
declared original scope. Define section dependencies and original hashes.
Keep pattern text out of retained root metadata.

**Modify `assistant/src/storage.ts`.** Reuse current Azure/MemoryStore
conditional put/remove and identity. Add bounded hierarchical project enumeration,
metadata-only stat (ETag/size), cancellation/request limits, and explicit uncertain
I/O outcomes. Preserve 26 MiB per-object reads and keep individual artifacts
within it. Implement identical conditions/race behavior in MemoryStore; no
cross-object transaction is claimed.

**Create `assistant/src/operations.ts`.** Define canonical fingerprints, attempt
receipts, shared admission, registered artifact IDs, sandbox ownership/poller IDs,
deadlines, cleanup states and reference-free recovery pages. Operations transition
registered -> running -> published/failed/uncertain -> cleanup_pending -> cleaned
as applicable; publication and external cleanup are distinct fields, not one
success flag. Idempotent lookup never resumes paid work. Keep content-free
receipts 30 days or until unresolved cleanup is settled.

**Modify `assistant/src/projects.ts`.** Add schema-2 reference pointers, internal
source fence/registered artifact set, default/origin/imported-start context, and
bounded addition headers/statuses. Add hidden preparing state. Headers carry IDs/
category/scope IDs/activity/timestamps, not instruction text; remove them on
completion. The root ETag publishes headers and modification summaries together.
Internal registration does not advance public revision; visible changes do.
Implement placeholder/ETag sealing for every source-content writer, including
existing attach paths. Never publish unverified source/addition bodies.

Keep addition bodies under the source cleanup prefix. Reserve 4 KiB of root
capacity per active addition for deactivation/status summaries; all root-growing
writes, including notes, respect that reserve and the 26 MiB object bound.
Deactivation uses a bounded server summary per changed ID and releases its
reserve; it does not append another source body. Reject excess new additions/
notes explicitly, never a valid deactivation merely because the data budget is
full. Additions are limited as in Bounded Work; do not add a history compactor.

**Create `assistant/tests/documents.test.ts` and modify
`assistant/tests/service.test.ts`.** Test target disambiguation, supersession,
inactive corrections reopening issues, default-context precedence, source/text
hash distinction, capacity with successful deactivation, metadata-only stat and
conditional races. Keep existing API behavior while new source preparation is
not yet wired. Test delayed content PUTs before/after sealing, delayed empty
placeholders, ambiguous replies and missing-root fences.

**Checkpoint:** focused offline document/storage/project tests plus existing
check/lint/fmt pass. No converter/model dependency is needed for these tests;
existing supported service routes remain buildable.

### Phase 2: Sandbox converter and bounded model preparation

**Create `assistant/converter/requirements.in` and
`assistant/converter/requirements.lock`.** Declare the tested PyMuPDF 2.1 and
PyMuPDF4LLM 2.1 dependencies. Resolve the complete production lock with hashes,
including transitive licenses. Do not copy the Docling evaluation environment.

**Create `assistant/converter/worker.py`.** A fixed file-to-files converter,
not an HTTP server. Explicitly disable layout model/OCR, preserve page chunks,
line/link evidence and hashes, render full-page PNGs one page at a time, and
enforce the selected input/pixel/artifact/time limits. Read only fixed input and
output paths. A supervisor terminates conversion on wall timeout and reports a
typed sanitized failure; do not emit source text or upstream payloads to logs.
Validate illustration-only pages without relaxing rejection of unreadable scans.

**Create `assistant/converter/Dockerfile`.** Pinned Python 3.12 slim base,
non-root, hash-locked dependencies, Linux amd64, source-free image. No service
HTTP app, model downloads, user files, identity secrets or package caches.
Deployment imports this image as a fixed sandbox disk image.

**Create `assistant/src/converter.ts`.** Define injected SandboxTransport for
create/reconcile/policy verification, write/read bounded files, execute fixed
command, and delete/reconcile sandbox and associated snapshots. Implement with
the documented official TypeScript SandboxGroupClient; reuse ManagedIdentityCredential
and endpointForRegion, not source-provided URLs or a shell/CLI wrapper.
Select and pin a released SDK version matching the documented operations, then
check its types/Deno compatibility before enabling transport. Registry metadata
lookup failed during research; no version or runtime validation is claimed here.
Unavailable/incompatible SDK APIs block integration, not permission to invent
endpoints or fall back to the sidecar.

Persist ownership labels/poller IDs before input transfer. At create/reconcile,
verify the desired source-free image, XS candidate (0.25 CPU/0.5 GiB), no runtime
identities/secrets/ports/volumes, and effective deny-default egress. Never send
input when verification is uncertain. Validate every manifest path, ID, count,
length and hash before staging data, serially fetch page results, and surface
cleanup uncertainty. The command is a literal image entry point with fixed paths;
filenames/source text never become executable arguments.

**Modify `assistant/src/sources.ts`.** Route PDFs through the injected converter.
Retain existing HTML DNS/pinned-address/TLS checks, no redirects/credentials/
subresources, 2 MiB response and 100,000-character bounds. Extend the existing
single checked parse to retain document title, structural line references and
anchor labels/destinations. Resolve relative destinations against the checked
page URL (ignore untrusted base overrides); allow only inert http/https references,
reject/flag credential-bearing or unsafe schemes, and never fetch them. Preserve
script/style exclusion and visible text association. No HTML images or generic
PDF URL acquisition is added.

**Create `assistant/src/model-budget.ts`.** Store UTC-month ledgers at
`state/model-budget/YYYY-MM.json`. Use integer micro-US-dollars, configured
verified deployment prices, complete prompt/image/output bounds, conditional
reservation, call IDs and exactly-once settlement. Reconcile undispatched
midnight crossings without double reservation; dispatched calls stay attributed
to their recorded start month. Unknown usage remains there. Enforce shared
exhaustion/accounting errors, 10,000-reservation bound and no cache assumptions.

**Create `assistant/src/assistance.ts`.** Managed-identity Azure v1 Chat
Completions client, verified candidate deployment, low reasoning, strict schema,
`store: false`, direct image data, no tools/remote URLs/storage APIs. Inject
transport/clock/prices for tests. Enforce call/token/image/attempt/deadline limits.
Distinguish refusal/filtering, invalid output/references, truncation, missing usage
and uncertain network outcomes. Never accept partial generated evidence or
claim that model-reported coverage is independently verified.

**Create `assistant/src/preparation.ts`.** Combine PDF/HTML evidence, stable
sectioning, bounded initial review, targeted follow-ups and validation into a
candidate original reference. Preserve ordered coverage of instruction lines,
all size sequences/units/links, immutable raw evidence and full-page references.
Any uncertain normalization stays attributed/flagged; do not silently repair
arithmetic. Return a candidate to Projects; do not publish independently.
No default-size generation or model rewrite of saved additions exists.
Failed review can leave a complete converter-derived preview with explicit
coverage/issues; incomplete evidence or invalid metadata fails preparation.

**Create `assistant/tests/converter.test.ts`,
`assistant/tests/preparation.test.ts`, and
`assistant/tests/model-budget.test.ts`. Create
`assistant/converter/converter_test.py`.** Use synthetic/injected fixtures:
real heuristic column continuations, illustration-only page, eight sizes and
unit associations, complete overlays; malformed/encrypted/limit/timeout cases;
denied/missing sandbox policy, credential-free configuration, lost create/delete
responses, snapshot ownership, unsafe paths/oversized outputs; HTML title/relative
links; section coverage and all-size preservation; failed review; concurrent/
duplicate reservations, unknown usage, reasoning, midnight crossing and delayed
settlement. No purchased fixture or paid model call.

**Modify `assistant/deno.json` and `assistant/deno.lock`.** Pin the verified
official sandbox package using the package manager; retain existing Azure
identity/storage dependencies and pdf-lib test helpers. Remove pdfjs-dist only
when Phase 3 switches all production PDF call sites together. No new test
framework. Ensure all new source/test files are checked/linted.

**Checkpoint:** converter contract tests with fake sandbox/model transports,
Python unittest with locked dependencies and bytecode disabled, assistant
check/fmt/lint and targeted tests. Real Azure is not required for this checkpoint;
unsupported SDK/platform claims remain explicit integration gates.

### Phase 3: Atomic project operations and external API

**Modify `assistant/src/projects.ts` and `assistant/src/operations.ts`.**
Complete source-based creation, retry reconciliation and cleanup protocol.
Publish original pointers/default context and summaries only after verified
candidate staging. Add immutable addition body and activation header in one
logical commit; deactivation changes only root status/summary and issue resolution
derived from active records. Reject stale revisions and unknown/conflicting IDs.
Failed publication never overwrites newer notes or blindly deletes referenced data.

Implement set_project_size without model calls. First selection saves context;
permitted replacement changes only context. Otherwise use the original pinned
revision to copy immutable source/reference/page evidence independently into a
hidden new root with the requested default, new IDs/ownership and a new creation
name. Do not copy progress/adaptations or auto-select. If corrections/other changes
are explicitly requested for transfer, clarify scope and accept explicit IDs;
otherwise preserve original unresolved issues rather than silently transfer
their resolution. No original cleanup depends on the new project afterward.
Verify the origin revision/fence before publication; origin changes/cleanup
produce a conflict and safe candidate cleanup, not a partially sourced knit.

**Modify `assistant/src/server.ts`.** Preserve existing page/voice authentication
classes; retain authorized actor for shared routes. Enforce active-project access
for voice, owner-page selected-project access for preview, no agent-bearer page
images. Keep existing create/attach/original-read contracts for notes-only and
older callers, but route all attachment source writes through the fenced path.
Switch all PDFs to the converter together; no fallback to bad flat extraction.

| Route | Contract |
| --- | --- |
| POST /v1/projects/from-pdf | Page multipart PDF/import UUID; 201 after atomic publication only. |
| POST /v1/projects/from-url | Page checked HTML URL/import UUID; same publication/recovery semantics. |
| GET /v1/import-attempts and /{id} | Page bounded receipts, confirmed outcome or explicit uncertainty/cleanup state. |
| POST /v1/import-attempts/{id}/cleanup | Page retry owned/unreferenced artifact and external-resource cleanup; no re-preparation. |
| GET /v1/projects/{id}/working-instructions | Shared index then requested original sections/active additions, revision-bound. |
| POST /v1/projects/{id}/size | Shared default-context operation or independent new-project outcome. |
| GET /v1/projects/{id}/source-pages/{page} | Page-only authenticated PNG; no arbitrary storage key. |
| GET /readyz | Process/config/client initialization readiness, not a remote Blob/model/sandbox health claim. |

Keep /healthz process-only and avoid network/model work in probes. Busy admission
does not make the app unhealthy. Preserve Ravelry 501 routes. Ordinary JSON remains
16 KiB; allow at most 512 KiB only on validated instruction-change bodies, with
stricter resulting addition limits. Multipart remains 25 MiB plus envelope.

**Modify `assistant/openapi.yaml`.** Fully specify response/error unions,
source-based creation/recovery, actor access, default/origin, blocked targets,
coverage, pagination and copy outcomes. Retain operation IDs
`get_working_instructions` and `set_project_size`. Extend save_modification
with optional instructionChange:
* `add`: category, 1-10 validated original targets, addition text, optional scoped
  size choice, explicit supersedes IDs, and attributed issue resolutions.
* `deactivate`: 1-100 explicit addition IDs and user scope/intent summary.
Notes-only calls omit it. Both use expected revision and server retry identity.
No replace_sections or undo_latest variant.

Working index returns section IDs/order/dependencies, project-wide change and
issue summaries, default/origin and pagination cursors. Section reads require
the expected revision and 1-4 IDs. Return originalMarkdown as reference, applicable
active additions/corrections, resolved/blocked targets and reasons, and note/change
cursors. Do not describe raw unresolved text as guidanceMarkdown. Paginate in
groups of 20 and reject oversized requests explicitly, never truncate or mix
revisions. Size result discriminates `updated` from `project_created` and
includes active-selection-unchanged plus new identity when applicable.

**Modify `assistant/src/config.ts` and `assistant/src/main.ts`.** Validate
sandbox subscription/resource group/group/region/image identity, model enablement/
deployment/version/prices, request limits and managed identity. Construct injected
transports once; no runtime ARM setup, raw arbitrary endpoint, new model API key,
queue or sweeper daemon. Existing private-container startup check remains.
Missing sandbox configuration makes PDF preparation unavailable explicitly, not
an old-parser fallback; supported HTML/notes can remain available. Disabled model
review appears in coverage rather than as successful review.

**Modify `assistant/tests/service.test.ts`; extend Phase 1/2 tests.** Verify
auth/active boundaries, original API compatibility, no visible empty projects,
atomic add/supersede/deactivate with unchanged notes/progress, ambiguous overlaps,
reopened issues, initial imported/default size and ordinary adaptations,
started/unknown/default-copy cases, unchanged source project and explicit selection,
independent deletion, stale reads/pagination, capacity, and recovery after each
storage/external boundary. Inject late successful content writes and uncertain
sandbox/snapshot deletion, not merely cancellation exceptions.

**Checkpoint:** all existing assistant tests plus targeted new suites,
check/fmt/lint. Routes use fakes for external services. Every source writer is
fenced before removing pdfjs-dist; no intermediate production rollout is required.

### Phase 4: Preview, Builder, deployment definitions and operating instructions

**Modify `assistant/web/index.html`, `assistant/web/app.ts`, and
`assistant/web/styles.css`.** Source-based PDF/HTML creation, automatic names,
processing versus upload status, session-retained attempt IDs/recovery,
reference-plus-additions preview and inactive change inspection, issues/coverage,
default selector and new-project/explicit-selection handoff. No HTML Markdown
renderer, optimistic success, fake Ravelry UI, silent retry, or bearer URLs.
Use authenticated revocable PNG blobs, four-image memory bound, system theme and
keyboard/status accessibility. Deactivation UI identifies affected records and
does not masquerade as undo of physical work.

**Modify `assistant/builder-instructions.txt`.** Replace both full-original-read
rules with working index then required original sections plus active additions,
dependencies and paged context. Save default once when needed; no generation.
Use supplied additive records, explicit supersession or scoped deactivation;
clarify ambiguous intent, target or correction/customization reset scope.
Keep reported work separate. Known unresolved instructions require clarification.
Original reference is same-project only. On uncertain writes retain original
payload/retry identity; on stale revision reload without silently reapplying.

**Create `assistant/infra/sandbox.bicep`.** Use documented
`Microsoft.App/sandboxGroups@2026-07-01`, dedicated group name/verified region
and scoped runtime role assignment. Expose non-secret group configuration only.
Keep runtime identity outside sandbox workloads. Deploy/import the pinned
source-free disk image separately through verified documented data-plane steps;
Bicep group creation alone does not configure per-sandbox egress or import images.
Runtime verifies deny policy for every attempt. Do not add VNet/firewall resources,
persistent source volumes, or blanket subscription roles as an implicit fix.

**Create `assistant/infra/assistance.bicep`.** Optional Azure OpenAI resource and
verified GPT-5.4 mini Global Standard deployment, explicit region/version/quota,
local-key authentication disabled, resource-scoped OpenAI User role for existing
runtime identity, non-secret outputs. No reserved capacity, Files/vector/
conversation service, or silent model/region fallback.

**Modify `assistant/infra/service.bicep` and
`assistant/infra/service.example.bicepparam`.** Reference sandbox/optional model
modules and non-secret settings. Retain Deno as the only app container at
0.5 CPU/1 GiB, zero-to-one replica candidate, private registry/storage and auth.
Do not add a converter sidecar, localhost converter URL or sidecar probes.
Use process liveness/startup and configuration readiness without paid probe calls.
Do not edit ignored service.local.bicepparam. main.bicep is reused unchanged.

**Modify `assistant/Dockerfile` and `assistant/.dockerignore`.** Keep Deno-only,
non-root, no local process-execution permission; include new modules/locked SDK,
exclude converter sources/tests/caches from the Deno runtime image. Build the
separate converter image for sandbox import, not as another app container.

**Modify `assistant/.env.example` and `assistant/README.md`.** Document phases,
two image builds, source-free disk import, exact verified SDK/API parameters,
identity/egress and privacy settings, cost categories, admission-month budget,
request limits, content-free markers, external-resource cleanup/recovery,
notes-only completion and release gates. No new Azure model secret is required;
retain current Builder bearer handoff via local Swamp vault.

Builder setup must update existing manual HTTP-tool entries, not assume a schema
import feature. Specify URLs, owner/voice auth separation, inputs/outputs,
nested optional instruction-change union, new read/default operations, revised
instructions and explicit-selection result. Schema import is optional only if
verified in the actual interface. Verify parameter expressiveness and synchronous
tool timeout before enabling these tools with private sources.

**Checkpoint:** build:web, check/fmt/lint/tests; compile service, sandbox and
assistance Bicep; build both Linux amd64 images with locked dependencies. Compare
OpenAPI, manual Builder instructions and server responses. No cloud deployment
is part of this checkpoint.

### Phase 5: Authorized integration and release verification

No additional production files beyond the above are implied. Record operational
results in the existing README/checklists; use synthetic or permission-cleared
fixtures, not purchased content. Deployment, paid calls and sample transmission
still require their own authorization.

* Verify/pin SDK release and actual data-plane APIs, Deno runtime compatibility,
  image import, region/quota and identity role. If unavailable, block rather than
  hand-build a guessed transport or reintroduce a sidecar.
* In an authorized sandbox test, assert denied internet/DNS/direct-IP/identity
  access, no app secrets, valid PDF/output transfers, bounded execution after
  controller loss, and deletion of sandbox plus source-containing snapshots.
  Confirm documented authoritative deletion/expiry states; stop for a decision
  if no enforceable retention/runtime bound is available.
* Verify Azure model API/version/settings/prices/image accounting/storage and
  standard abuse-monitoring disclosure through authorized synthetic calls.
  Charges count in the shared admission-month allowance.
* Require grounded facts/answers or explicit abstention on a permission-cleared
  2-, 4- and 10-page set: continuations, eight-size associations, units, vector
  overlays, scoped additions, repeated anchors and unresolved diagrams. Any
  unflagged wrong expected fact blocks release. This is not a universal score.
* Measure cold/warm four-page end-to-end preview, image transfer/deletion overhead,
  sandbox and Deno CPU/memory, simultaneous voice reads, bounded three-attempt
  behavior and actual cost. Target roughly 60 seconds; hard deadlines and safety
  remain independent. Do not silently add background jobs or larger resources.
* Verify real preview sign-out disposal, reference-plus-additions voice guidance,
  scoped resets with clarification, imported/default size, new-project copy and
  explicit selection, lost replies and complete cleanup through configured Builder.
* Price the complete backend at current regional rates, not assuming credits or
  shared free grants: maximum active Deno replica, sandbox compute including
  unresolved attempts, image/snapshot/storage categories (including announced
  future charges), registry, model allowance, Blob capacity/transactions, network
  and monitoring. Require projection at most $120 for headroom below $150.
  Alerts and application counters do not cap every possible Azure charge.
* Roll out schema-2 backend and Builder configuration together. Old prompts still
  read originals and are not the new experience. A schema-1 image is not a safe
  rollback after schema-2 data; use a compatible forward fix/image.

## Additional Resources

* [Converter comparison](./converter_comparison.md): completed local observations,
  not an Azure benchmark or proof of guidance accuracy.
* [Assistance model research](./assistance_model_research.md): candidate, lifecycle,
  prices and unverified assumptions; size-generation estimates are historical.
* [Converter isolation investigation](./converter_isolation_research.md).
* [Azure sandbox overview](https://learn.microsoft.com/en-us/azure/container-apps/sandboxes-overview),
  [TypeScript SDK](https://sandboxes.azure.com/docs/sandboxes/quickstart/setup-typescript-sdk),
  [egress](https://sandboxes.azure.com/docs/sandboxes/sandbox/egress),
  [snapshots](https://sandboxes.azure.com/docs/sandboxes/snapshots),
  [Bicep group schema](https://learn.microsoft.com/en-us/azure/templates/microsoft.app/2026-07-01/sandboxgroups).
* [Azure model privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy),
  [Global deployments](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types),
  [Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/),
  [registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/),
  [Azure OpenAI pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/),
  [budget alert limitations](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets).

*Drafted with EGM*
