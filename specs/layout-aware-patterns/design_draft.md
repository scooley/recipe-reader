# Layout-Aware Pattern Working Instructions

* **Author:** @scooley
* **Status:** Draft - Overview & Goals, Technical Plan, and Alternatives approved; heuristic PyMuPDF selected; Detailed Implementation in discussion
* **Date:** 2026-11-24
* **Predecessor:** [Concept brief](./concepts_brief.md)

## Overview

Turn a pattern source into editable Markdown named for the project and
identified as its **working instructions**, organized by the pattern's logical
sections. Sources include uploaded PDFs and supported public webpage URLs;
future Ravelry imports must fit the same project-creation flow without making
PDF upload mandatory. Layout-aware conversion applies to acquired PDFs,
regardless of how they arrive. Generate the displayed name from the pattern name and the clock's
month and year in `mmyyyy` format, such as "Liya Top - 112026," without asking
for a project name or date. This is the document's creation month, not an
assertion about when knitting began. Keep project identity separate so distinct
knits with the same displayed name remain distinguishable. The original
interpretation preserves all sizes, associated values, tables, links, and visual
references. Once a project has a chosen size, its working instructions and notes
may focus on that size. The complete original interpretation and, for PDF
sources, the original PDF remain available for reference rather than being
overwritten by project changes.

The service provides a preview of the instructions and highlights potential
interpretation problems beside the affected content. The voice agent uses the
saved instructions, asks focused questions when details are unclear, and records
changes the user explicitly requests. Verbal review while working is sufficient;
opening the preview or approving every section is not required.

This document extends the existing personal pattern and recipe assistant for
layout-aware pattern PDFs. This phase produces a design only; it does not change
the running service or deploy resources. Technical choices remain open until
the owner selects them.

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

1. **Produce coherent instructions.** Preserve logical section order across
   columns and pages, including continuations and relevant shared instructions.
   Exclude recurring page furniture from the instruction flow without treating
   substantive repeated instructions as disposable.
2. **Preserve all sizes at interpretation, then allow project focus.** Retain
   complete size ordering, associated values, table headers, units, and ranges in
   the original interpretation. Once the project size is established, working
   instructions and notes may focus on that size without repeating every other
   size. Ask when the applicable size is unclear. Project focus must not destroy
   the original multi-size information or silently advance progress.
3. **Keep visual evidence usable.** Retain references that allow the user to
   inspect photographs, diagrams, labels, and overlays in context, with the
   original PDF available for comparison. Preserving a visual does not imply
   that the agent has interpreted it.
4. **Expose uncertainty without overstating accuracy.** Provide a preview and
   passage-specific issue indicators explaining what may need checking. A
   successful conversion or absence of warnings is not a correctness guarantee.
   Do not present an unvalidated score as a measured probability of correctness.
   Evaluation must include plausible errors the interpreter fails to flag.
5. **Support verbal review during use.** Let the user clarify an affected
   passage while working without a mandatory document-wide approval step. Do not
   block unrelated instructions because a different section needs review. Define
   the rules for using an unresolved passage in the technical plan.
6. **Make explicit changes recoverable and attributable.** Let the voice agent
   update saved working instructions in response to clear user direction and
   clarify ambiguous requests. Keep the original evidence intact, distinguish
   transcription corrections from intentional adaptations, and provide a way to
   inspect and reverse changes without losing unrelated work.
7. **Preserve the meaning of project records.** Questions, edits, and reading
   ahead do not advance progress. Continue to record explicit progress reports,
   modifications, and pending follow-ups separately from inferred work. Report a
   successful save only after persistence succeeds.
8. **Fit the existing private service.** Keep supported text-only inputs usable
   and preserve authenticated, project-scoped access. Define a complete lifecycle
   for new source-derived files, including failed conversions and revisions.
   Bound conversion work and avoid repeating PDF interpretation for each voice
   question. Storage, processing, and client changes require explicit design
   decisions rather than assumptions about current capabilities.
9. **Identify the specific project.** Give the working instructions a meaningful
   project-specific name that identifies the pattern and the particular knit.
   Keep that identity visible in the document and preview so separate projects
   using the same pattern are not confused.

Acceptance criteria will exercise the representative layout class using
synthetic or permission-cleared fixtures. They must cover cross-column
continuations, eight-size associations, measurement units, and composite visuals,
as well as misleading output, explicit edits, and preservation of existing
notes and progress behavior. The purchased PDF will not be added to repository fixtures.

## Non-Goals

These boundaries were approved with Overview & Goals:

* Universal PDF understanding, arbitrary knitting-chart decoding, or general
  support for scanned documents. The initial target is the representative
  image-bearing, multi-column pattern layout class.
* A complete machine-readable knitting language, automatic pattern repair, or
  guessing missing stitch counts, instructions, or diagram meanings.
* Discarding other sizes from the preserved original interpretation. This does
  not prohibit project instructions or notes focused on the chosen size.
* Mandatory preview approval or review of every section before voice use.
* Interpreting pattern content as permission to invoke tools, change agent rules,
  retrieve external resources, or alter project records.
* Replacing LiveKit with a new voice client, implementing Ravelry access, or
  changing how patterns are purchased or acquired.
* Publishing, reciting, or exporting whole restricted patterns through voice
  tools. The private working copy serves the user's project, not redistribution.

## Open Questions

These questions carry forward the brief's unresolved decisions. They will be
resolved individually before their answers become architecture or implementation
requirements.

* **Interpretation:** Heuristic PyMuPDF is selected following the sample
  comparison. Resolve its licensing and downstream accuracy release gates,
  assistance triggers, and the specific Azure on-demand model deployment before
  production use. Model availability, pricing, and data handling remain subject
  to verification.
* **Processing:** How should the below-$150 monthly backend budget be allocated,
  and what per-document and resource limits apply? The owner chose
  request-bound conversion and expects roughly one minute to a usable preview
  for a typical four-page pattern, with a processing indicator. Request timeout,
  cancellation, and uncertain-outcome recovery remain to be specified. The owner
  confirmed there are no existing projects; no record migration or upgrade
  action is needed.
* **Evidence:** Page-level references are selected. Specify how the agent handles
  a needed visual that remains uninterpreted without claiming page preservation
  means visual understanding.
* **Size:** How is the project size persisted and how are project-focused
  instructions produced? The owner chose a new project for a size change after
  the knit has started. All sizes remain in the original interpretation; project
  notes may focus on the chosen size.
* **Editing:** Working instructions use Markdown plus companion metadata, with
  an edit journal and periodic full copies. Specify journal entries, publication,
  checkpoints, corrections, intentional adaptations, conflicting edits, retries,
  undo, and reconversion. Notes and working instructions remain separate linked
  records, presented together to the voice agent and in the project preview.
* **Voice read API:** A new `get_working_instructions` tool is selected. Specify
  its response, revision behavior, and coordinated
  Builder rollout in Detailed Implementation; preserve `get_source_text` for
  explicit reference to the active project's original interpretation.
* **Retention:** Notes-only completion is selected. Specify the cleanup boundary
  for original sources, working instructions, visuals, temporary outputs, and
  revisions without turning retained notes into a full-pattern archive.
* **Uncertainty:** Which unresolved readings require a verbal question before
  the affected instructions can be used, and what evidence would justify a
  numerical confidence indicator?

### Clarification after the concept brief

The owner clarified that the original pattern interpretation should preserve all
sizes, but project notes may focus on the size chosen for that project. The
brief's objection to permanently discarding sizes is not a requirement to repeat
all sizes in project-specific notes. No storage or generation mechanism is
selected by this clarification.

The owner also clarified that working instructions must be named for the pattern
and specific knit rather than carry a generic document name. The owner selected
automatic pattern-name extraction plus the clock's month/year in `mmyyyy`
format, without asking for more naming information. Display names do not replace
project IDs.

The owner asked about existing PDF tools rather than assuming an LLM is needed
for conversion. The owner subsequently selected tool-first conversion with
targeted model assistance, then heuristic PyMuPDF after the local comparison.
The assistance model remains unselected. A document
tool can recover text, layout, and tables and preserve visual references without
generating an interpretation of every diagram. Local layout or OCR models are
not the same requirement as a generative language model or a hosted LLM API.

The owner confirmed there are no existing projects. Do not build record migration,
lazy upgrades, or a management-page upgrade action. New project records should
support working instructions from the start. This does not remove supported
text-only inputs or change the selected original-source API contract.

## Critical User Journeys (CUJs)

### CUJ 1: Import a normal image-bearing pattern

* **Given:** The user is signed in to the source-management page and wants to
  create a project from a pattern PDF.
* **When:** The user uploads a pattern with columns, images, and multiple sizes.
* **Then:** The page distinguishes uploading from processing. The service uses
  the converter first and targeted assistance within its allowance. It saves an
  all-size interpretation and project working instructions with page references
  and identified issues, then publishes the automatically named project as one
  logical operation, or reports an explicit failure without leaving a visible
  empty project. A prior manual Create Project step is not required. The typical four-page
  target is roughly one minute to preview, not a promised measured result.

This PDF journey is not the only creation path. A supported public webpage URL
must also be usable to create a project without uploading a PDF. Future Ravelry
acquisition supplies its PDF to the same conversion and project-publication
path; implementing Ravelry access remains outside this effort.

### CUJ 2: Work in the selected size and resolve an issue verbally

* **Given:** The active project has saved instructions and the user has specified
  the applicable size.
* **When:** The user asks for an instruction or clarification.
* **Then:** The agent uses that project's saved working instructions and size,
  asks about unresolved relevant details, and can refer to original pages.
  Unrelated sections remain usable. Questions do not advance progress or rerun
  conversion. A later change of size after starting requires a new project.

### CUJ 3: Make and reverse an explicit change

* **Given:** The agent has the current active project and working-copy revision.
* **When:** The user explicitly requests a modification or reversal.
* **Then:** The agent clarifies an ambiguous target, records an attributable
  change, and confirms only a successful save. The edit journal can reconstruct
  the result without a model replaying the conversation. Original evidence and
  unrelated progress remain unchanged; stale edits do not overwrite newer work.

### CUJ 4: Complete a project

* **Given:** The user explicitly requests and confirms completion.
* **When:** The service completes the project and removes source-derived files.
* **Then:** Notes and progress remain, but the original, working instructions,
  visuals, and source-derived edit history do not. Required deletion failures
  produce an explicit partial-completion result that can be retried.

## Technical Plan (Architecture)

The decisions below define the approved high-level architecture. Heuristic
PyMuPDF has been selected; licensing, broader downstream accuracy, and specific
Azure model selection remain gated. Exact API schemas, journal
operations, failure limits, and Builder configuration must be resolved before the
Detailed Implementation section can be approved. No benchmark or deployment has
been performed in Azure as part of this design discussion. A local sample
comparison has now been completed; see [converter comparison](./converter_comparison.md).

### Selected conversion policy: tool first, targeted model assistance

Use a PDF conversion tool first to recover text, reading order, sections, tables,
and visual references. Apply generative model assistance to passages or visuals
that the tool cannot resolve, rather than make whole-document generative
transcription the default. Save the resulting interpretation for later voice
use; repeated questions must not trigger repeated PDF conversion.

Tool output is evidence, not proof of completeness. Checks and issue indicators
can identify some problems but cannot reliably detect every wrong reading.
Model-assisted output remains subject to source comparison, uncertainty flags,
and verbal clarification. Preserved visuals must include relevant labels and
overlays regardless of whether a model interprets them.

The converter is selected below; assistance triggers, the specific Azure model,
and detailed resource allocations are not yet selected. The voice agent remains distinct from
document conversion; choosing assistance here does not assume LiveKit Builder
can accept images through existing tool responses.

### Selected converter decision process: bounded comparison

Compare Docling and PyMuPDF before selecting the converter. The owner requested
and received a local comparison on the representative PDF, including both
default and heuristic PyMuPDF layout modes. The results are in the
[converter comparison](./converter_comparison.md); the owner then selected
heuristic PyMuPDF. Do not select a winner from advertised capabilities or general
benchmarks alone.

Use the same synthetic or permission-cleared representative cases for each
candidate. Compare section order and cross-column continuation, complete size
values and their associations, table units and headers, and preservation of
diagram overlays. Record failures as well as successes. Measure conversion time,
peak memory, and deployment footprint in a stated environment; assess code and
model licensing separately. Compare the tool outputs before model assistance so
the assistance does not hide extraction failures.

The evaluation must also expose unresolved content for targeted assistance and
retain usable source references. Define pass/fail criteria, evaluation limits,
and the decision owner before executing it. If neither candidate meets those
criteria, return the evidence for a new decision rather than silently choose a
third dependency or expand model assistance to every page. The comparison does
not authorize transmitting the user's PDF to an external service.

### Selected converter: explicitly configured heuristic PyMuPDF

Use PyMuPDF/PyMuPDF4LLM's heuristic extraction path, explicitly disabling the
newer layout-model path with the supported `pymupdf4llm.use_layout(False)`
configuration before conversion. The tested baseline is `pymupdf==2.1` and
`pymupdf4llm==2.1`; pin and lock the production dependency set and its licensing
review rather than rely on whatever default a later version selects.

The owner selected this baseline because the sample retained the main
instruction flow, size values, and glossary links with much lower measured
runtime and memory than Docling. A model can consume bold labels and plain
measurement rows; formal Markdown headings and tables alone do not establish
better downstream guidance. This does not waive the section organization and
preview requirements or assume every later pattern will extract accurately.

Normalize section structure and table/unit associations without guessing
instructions, and prefer complete original-page references to duplicate or
cropped image exports. Retain the tested layout mode as an explicit regression
condition. The default layout mode failed reading order on this sample and must
not be silently substituted.

Licensing resolution and downstream accuracy checks are release gates. Confirm
the applicable AGPL obligations or commercial terms, including shipped
dependencies, before deployment. No license purchase is authorized here. Broader
accuracy checks must test model guidance grounded in saved working instructions,
not just count preserved numbers. No downstream answer-quality equivalence has
yet been measured between converters.

### Selected user experience target: roughly one minute

For a typical four-page pattern, target roughly one minute from upload to a
usable preview, with a visible processing indicator. Measure the complete path,
including any model assistance and cold-start delay, not just text extraction.
This is the owner's acceptable-wait target, not a measured capability or an
automatic timeout value. Define larger-document limits and timeout behavior
separately. Do not invent a completion percentage when the processing stage
cannot supply one.

### Selected execution policy: request-bound conversion

Perform conversion and any targeted assistance within the upload request. Do
not introduce durable conversion jobs, a queue, or automatic background retries
as part of this design. Show an indeterminate processing indicator after upload
until a response or explicit failure; upload progress and processing completion
are different signals.

The current upload route already awaits extraction before attaching a source.
Its implementation is Deno-only, while both comparison candidates introduce a
Python runtime. The owner selected a Python sidecar in the same Container App;
its resource requirements still need measurements.

Define finite conversion and assistance deadlines, cancellation, and cleanup.
A lost HTTP response is not proof that persistence failed: the client must
reconcile the original creation attempt before retrying, even when it did not
receive the newly created project's ID. Specify a retry identity and recovery
lookup in Detailed Implementation so a retry cannot create a duplicate project.
Existing attachment requests must refresh project state before retrying.
Conversion must not report a
usable source before required output is persisted. Deployment request limits,
cold-start behavior, and converter capacity must be checked against the roughly
one-minute experience target. If measurements show this policy cannot meet the
target, return that conflict to the owner rather than silently switch to
background work.

### Selected cost constraint: backend below $150 per month

All backend costs related to this service must total less than $150 per month,
not $150 for conversion alone. Account for the application, converter compute,
registry, storage and requests, network transfer, model assistance, and any
monitoring or evaluation resources. The chosen design must leave headroom for
usage variation rather than allocate the entire ceiling to normal operation.
Specific monthly allocations have not been approved.

The repository currently provisions a Basic registry, private Standard LRS Blob
storage, and a Consumption Container Apps environment. Persisted environment
logs are disabled in the template. These facts identify cost categories; they
are not a measurement of current deployed usage or billing. Container Apps free
grants are shared at subscription level and cannot be assumed wholly available
to this project. A Python converter's memory and startup requirements still
need measurement.

The owner selected a $0.10 model-assistance allowance per typical four-page
document. This is separate from application and converter compute and is not a
quoted model price or a prediction of actual charges. It includes all targeted
assistance calls and retries within that conversion, not $0.10 for each passage.
Constrain assistance to that allowance; leave unresolved passages flagged for
verbal clarification rather than silently exceed it. Actual cost depends on the
selected deployment, image inputs, tokens, retry limits, and use volume. The
technical plan must define how to bound spend before making a call, as well as
larger-document and explicit-retry policies. The one-time comparison must also
have a bounded spend allocation. Azure on-demand hosting has been selected, but
no specific paid model deployment has been selected or created.

Azure Cost Management budgets send alerts; they do not stop consumption and
billing data is delayed. Therefore a budget alert alone cannot guarantee the
monthly ceiling. Specify bounded resource allocation, request/token/retry
limits, and an action when the remaining operating allowance is insufficient.
Credit eligibility for any future service or marketplace license must be
verified rather than assumed. Costs billed outside Azure must be called out
separately instead of represented as covered by this backend budget.

### Selected assistance hosting: Azure on demand

Use an Azure-hosted on-demand model for targeted assistance rather than host a
generative model ourselves. Do not provision reserved model capacity. Evaluate a
specific model and deployment for visual input, latency, output fidelity, regional
availability, subscription access, credit eligibility, and pricing within the
$0.10 allowance before selecting it. Do not assume a generic model-family name
establishes those properties.

Prefer managed identity where the selected service supports it; verify its
authentication and required role before specifying deployment changes. Keep
model calls in the backend, not browser code or Builder prompts. Data handling
and retention for the selected deployment must be reviewed before sending user
documents. No document transmission or new Azure resources are authorized by
this design discussion.

### Selected converter boundary: Python sidecar

Run the converter in a separate Python container within the existing Container
App. Deno calls the sidecar over a local endpoint and awaits its result within
the upload request. Expose only the existing Deno application through public
ingress; the converter is not a public upload API. Keep the converter's image
and dependencies separate from the Deno runtime.

The containers share replica startup, scaling, and the total resource footprint.
This boundary does not independently scale conversion away from voice-serving
replicas. Measure both containers together against cold-start latency, memory,
and the monthly budget; do not assume the current 0.5 CPU / 1 GiB configuration
will fit either candidate. Define readiness, request bounds, deadlines, and
cleanup for an unavailable or interrupted sidecar before deployment.

### Selected completion retention: notes only

On explicit project completion, retain project notes, explicit progress,
modification history, and pending follow-up records. Remove the PDF, complete
original interpretation, project working instructions, visual derivatives,
temporary source-derived output, and their revisions. Retained notes may refer
to the project and its changes, but must not be used to retain a disguised full
copy of the removed pattern.

This preserves existing source-cleanup intent. Completed projects cannot answer
from removed instructions or claim original evidence remains available.
Completion must not be reported as fully cleaned up if any required deletion
fails; preserve the current explicit partial-completion and retry behavior.
Explicit project deletion also removes retained notes and history.

### Selected working-document format: Markdown plus companion metadata

Keep the editable instructions in Markdown. Use a small companion metadata file
for stable section identities, source references, review flags, and revision
identity. The metadata describes the Markdown and its evidence; it is not a
second authoritative transcription or a complete knitting-language schema.

Publish matching Markdown and metadata as one logical document version so an
instruction cannot be paired with another revision's evidence or warnings.
Define the consistency and recovery mechanism before specifying write APIs.
Keep the original all-size interpretation distinct from the project-specific
editable copy, which may focus on the selected size. Notes-only completion
removes both documents and their source-derived metadata.

### Selected history storage: edit journal with periodic full copies

Record working-instruction changes in an edit journal, with periodic full copies
of matching Markdown and metadata. Reconstruct the current or historical version
from a full copy plus its subsequent accepted edits. Do not instead store a full
immutable document pair for every change.

Journal reconstruction must not call a model to reproduce prior edits: recorded
changes must have deterministic effects against their identified base version.
Keep evidence corrections, intentional adaptations, notes, and progress
distinguishable. A journal entry must not imply that work was performed merely
because instructions changed.

Specify atomic publication using the existing conditional-write capabilities,
stale-edit rejection, retry identification, recoverable undo, and checkpoint
creation before implementation. Reconstruction limits and checkpoint cadence
must keep voice reads bounded. Source-derived journal entries and full copies
are subject to notes-only completion cleanup, even when separate project
modification summaries are retained.

### Selected project organization: separate linked instructions and notes

Keep working instructions and personal project records as separate linked
records, but present them together in the project preview and to the voice
agent. The user should not need to manage two documents or choose an internal
tool while speaking. Link records to the project and, where applicable, the
relevant working-instruction section and revision.

An instruction change alters future guidance; a note adds context; progress
records explicit completed work. Preserve those meanings without turning every
note into a pattern rewrite or every question into progress. An explicit request
that changes both instructions and a linked modification summary must not leave
the two in disagreement after a partial save.

This organization also supports notes-only completion: source-derived working
instructions and their journal are removed, while attributable project notes,
progress, and modification summaries remain. A retained note is not a hidden
archive of complete instructions.

### Selected voice write API: extend `save_modification`

Extend the existing `save_modification` tool with optional working-instruction
edits. A notes-only call retains its existing meaning; it must not rewrite
instructions. When explicit edits are included, publish them and their linked
modification summary as one logical operation, with revision checking and retry
identification. Do not require the agent to call a second write tool to bring
notes and instructions into agreement.

Keep the distinction in the API inputs, validation, and history, not in questions
that force the user to select internal record types. Clarify genuinely ambiguous
intent rather than infer an instruction change from every note or question.
Define the edit representation, correction attribution, stale-version behavior,
and uncertain-outcome recovery in Detailed Implementation. Existing callers
omitting the new edit fields must continue to create notes-only modifications.

### Selected edit representation: section replacement

An instruction edit identifies a stable section and supplies its complete
replacement Markdown against the expected current revision. Preserve untouched
sections. Do not locate the edit by an ambiguous heading alone, and do not
silently replace a newer version when the caller's base is stale.

The model must carry forward unchanged wording within the edited section; this
is a known risk of the selected approach. Record the exact previous and accepted
section content, or equivalent deterministic information, so journal replay and
undo do not require the model to regenerate prior text. Keep the edit linked to
its modification summary and section identity.

An edit does not imply progress. If a spoken request does not establish a clear
target or change, clarify it before submitting a replacement. The API still
needs exact validation limits, metadata-update rules, and checkpoint behavior
specified in Detailed Implementation.

### Selected evidence granularity: page-level references

Link each logical section and its issue indicators to the relevant original PDF
pages. A section may reference several pages in order. The preview must let the
user compare the instructions with those full pages, including photographs,
vector overlays, labels, and surrounding context.

Do not require region coordinates, passage bounding boxes, or crop navigation
for this version. The user locates the relevant passage within the referenced
page. Textual issue descriptions can identify the disputed wording without
pretending to offer region-level highlighting. Preserve the difference between
an available reference page and an interpreted diagram.

### Selected size-change policy: new project

Establish the applicable size explicitly rather than infer it from the pattern's
sample garment or the first size listed. Preserve all sizes in the original
interpretation; the project's working instructions and notes may focus on the
chosen size.

If the user changes size after starting the knit, create a separate project
rather than rewrite the existing project's instructions and history. Do not
automatically transfer progress or adaptations to the new size or mark work as
completed there. Keep the existing project unchanged and follow the existing
explicit project-selection behavior. A new project must not bypass private
source ownership or notes-only completion cleanup through untracked shared
artifacts.

### Selected creation policy: create from a source, not only a file upload

For new PDF projects, accepting the source, preparing the instructions, and
publishing the automatically named project form one logical operation. Do not
require a separate manually named empty project before upload. Publish success
only after required source and working artifacts are saved; failed preparation
must not leave a visible empty project. Define staging cleanup and lost-response
recovery in Detailed Implementation rather than treating a failed response as
permission to create another project.

Project creation must not require a PDF file. Preserve supported public webpage
URL input as a first-class creation path. Keep how a source was acquired
(upload, URL, or future Ravelry import) distinct from its content format. Route
acquired PDF bytes through the selected PDF converter; use the supported webpage
extraction path for HTML rather than force it through PDF conversion or invent
PDF pages as evidence. Both paths produce project working instructions with
references appropriate to the source.

Future Ravelry plumbing can supply an acquired PDF and its origin information
to the same preparation and publication logic. This is a reuse boundary, not a
request to build a general import framework, implement Ravelry authentication,
or expose a nonfunctional import control now. Preserve existing public-URL
validation and bounded fetching; a URL is not permission to retrieve arbitrary
private resources. The converter handles supplied content, not acquisition
credentials or external-service login.

### Selected naming policy: pattern name plus clock month/year

Generate the working-document name from the detected pattern name plus the
clock's month and year in `mmyyyy` format. For example, a document created in
November 2026 for Liya Top is displayed as "Liya Top - 112026." Do not ask for
a project name or date, infer a knitting start date, or change the month on each
read or edit. The original PDF title is untrusted text, not an instruction to
the service.

Separate projects may have the same displayed name. Keep the existing unique
project ID as identity and disambiguate project selection rather than treat the
displayed name as a storage key. Title-detection failure behavior must be
specified before implementation without introducing a mandatory naming prompt.

### End-to-end data flow

This is the logical flow selected so far, not a finalized API or storage schema:

```text
Signed-in management page
    | PDF upload or supported public webpage URL
    | acquiring source, then processing indicator
    v
Deno source-creation request
    | PDF bytes -----------> Python PDF-tool sidecar
    | HTML ----------------> Existing webpage extraction
    |<---- extracted content, source references, issues
    |
    +--> Targeted Azure on-demand assistance, within allowance
    |       (only when needed; unresolved material stays flagged)
    v
Private project storage
    - Source evidence and complete original interpretation
    - Original PDF and rendered pages when the source is a PDF
    - Working Markdown, companion metadata, journal, full-copy checkpoints
    - Project and source-origin metadata
    |
    +--> Authenticated preview with original-page comparison
    +--> LiveKit voice tools: read, clarify, record explicit changes/progress
```

The request does not complete successfully until required artifacts and project
references are persisted consistently. LiveKit receives no anonymous Blob URLs
and does not acquire general access to the converter. A generated Markdown link
does not establish that the agent can see its image. The browser continues to
use Entra sign-in; voice tools continue to enforce the active-project boundary.
Future Ravelry acquisition feeds PDF bytes into this same path; it does not
require a second converter or a PDF-only project-creation contract.

### Existing components affected

* `assistant/src/sources.ts`: retain the supported text-only path and integrate
  the new layout-aware conversion result rather than remove rejection checks
  and pretend flat extraction is sufficient.
* `assistant/src/projects.ts` and `assistant/src/storage.ts`: persist distinct
  original and working artifacts, replay edit history, publish consistent
  revisions using conditional writes, and extend source cleanup.
* `assistant/src/server.ts` and `assistant/openapi.yaml`: define source-based
  project creation for PDF uploads and supported URLs, creation retry/recovery,
  authenticated reads, preview assets, and edit contracts, including compatibility with the
  existing source-text tool. These external interface choices remain open.
* `assistant/web/`: let the user create a project from a PDF or supported URL
  without a prior naming step; show processing, named working instructions,
  source-appropriate evidence, and issue explanations without a mandatory
  approval screen. Do not require a file for URL input.
* `assistant/builder-instructions.txt`: explain working-copy use, selected size,
  uncertainty, explicit edits, and the difference between changes and progress.
* `assistant/infra/`, container definitions, configuration, tests, and README:
  account for the sidecar, bounded Azure assistance, compatibility, operational
  limits, and setup. Exact file changes follow in Detailed Implementation after
  the outstanding choices and comparison gates are resolved.

### Selected voice-reading policy: active working project first

For normal guidance, read the active project's working instructions, including
its selected size and saved adaptations. Do not fetch both the complete working
copy and original interpretation before every answer. Consult that same
project's original pattern only to investigate an issue, resolve ambiguity, or
compare a change with its source.

"Original" means the unmodified source for the active project, not another
knit's instructions. Do not retrieve another project's source or working copy
without an explicit project switch. If the working copy is missing or corrupt,
report that problem rather than silently substitute the original and lose the
user's adaptations. There are no existing project records needing a legacy
working-copy fallback or upgrade path.

### Selected voice read API: new working-instructions tool

Add `get_working_instructions` as Builder's normal source for project guidance.
Return the active project's reconstructed working instructions, their revision,
applicable size, and relevant issue metadata. Define the exact schema and
context bounds in Detailed Implementation. Preserve `get_source_text` and its
existing original-source meaning for older clients and explicit investigation
of an issue in the active project.

Update Builder's tool configuration and instructions together: normal reading
must use the new tool, not invoke the old full-original-read rule as well. The
extra tool does not authorize cross-project reads. Editing tools must use the
revision associated with the working copy they read, and a source-reference
read must not silently replace that copy in the agent's guidance context.

Existing clients retaining the old prompt will continue to receive original
source text and cannot be claimed to support the new working-copy experience.
The rollout plan must make that limitation explicit. Keeping the old endpoint
compatible does not by itself migrate a client's behavior.

### Decisions still required before an implementation-ready plan

The local converter comparison and owner selection are complete. Preserve their
results and the explicit heuristic configuration; resolve licensing and broader
accuracy checks before release. Select and verify the specific Azure model
before fixing the assistance client and deployment.

The next design sections must also settle the edit operation and publication
contract, checkpoint limits, naming failure behavior,
targeted-assistance triggers, uncertainty handling, and concrete resource and
timeout limits. Approval of this high-level Technical Plan does not approve
unknown choices or declare the roughly one-minute/$150 targets achieved.

## Alternatives Considered

These alternatives come from the concept brief and subsequent owner decisions.
"Not selected" describes this design's scope, not a claim that the alternative
cannot work elsewhere. The agreed local comparison has since been performed, and the owner selected
heuristic PyMuPDF as the baseline. Docling remains a documented alternative,
not an additional production dependency.

| Alternative | Benefit | Drawback or failure condition | Decision and reason |
| --- | --- | --- | --- |
| Remove the current PDF extractor's image and column rejection checks | Small code change; accepts more files. | Does not solve column ordering, size associations, or missing diagram overlays. | Rejected: accepting a file is not adequate support for its instructions. Retain the supported text-only path. |
| Build a custom layout engine from increasingly detailed geometric rules | Direct control without a generative transcription step. | Layout-specific rules become a maintenance burden and can fail on the next pattern. | Not selected: compare existing document converters before building equivalent machinery. |
| Use a PDF converter without generative assistance | Avoids generative transcription errors and assistance API charges. | Leaves relationships or visual content unresolved when extraction is insufficient. | Not selected as the complete approach: the owner chose tool-first conversion with bounded, targeted assistance. Unresolved content may still need verbal clarification. |
| Make whole-document generative transcription the default | One interpretation stage can combine text and visuals. | Can omit or invent plausible details and spends model input on every page. | Not selected: extract with a document tool first and use assistance only where needed. |
| Reinterpret the PDF on each voice turn | Can revisit evidence without maintaining a working interpretation. | Repeated cost and latency; inconsistent output can lose the meaning of saved adaptations. | Rejected: persist the interpretation and working instructions, then use their identified revisions. |
| Use bare extracted images as the only visual evidence | Compact assets, directly available from many converters. | Photographs can be separated from vector arrows, labels, and surrounding text. | Rejected as the only evidence: retain original pages with complete visual context. |
| Require region coordinates and crop navigation initially | More precise navigation from an issue to its source. | Adds coordinate tracking and harder handling of multi-region sections. | Not selected: the owner chose page-level references and full-page context. |
| Store only plain Markdown | Simple to read and move between tools. | Stable section identities, evidence, and revision-specific review flags become brittle. | Not selected: the owner chose Markdown plus small companion metadata. |
| Embed all metadata in Markdown front matter and markers | One file contains both content and metadata. | More structural content for edits to damage; the document is harder to inspect. | Not selected: companion metadata keeps instruction text separate, with consistent logical publication required. |
| Build a fully structured knitting-language model | Could support specialized calculations and transformations. | Much larger schema and parser scope; introduces competing representations of the pattern. | Deferred: this version needs coherent editable instructions, not a complete knitting ontology or automatic pattern repair. |
| Save complete document snapshots for every edit | Straightforward reads, historical comparison, and undo. | Repeats unchanged content for every change. | Not selected: the owner chose an edit journal with periodic full copies, accepting replay and checkpoint complexity. |
| Use a durable background conversion job | Can survive page disconnection and separate processing from a request deadline. | Adds job state, coordination, cancellation, and cleanup. | Not selected: the owner chose request-bound processing. Revisit explicitly if measurements cannot meet that policy and the roughly one-minute target. |
| Run Python inside the Deno container | One image and no internal HTTP interface. | Couples runtimes and dependencies; requires process execution permissions. | Not selected: the owner chose a Python sidecar with a separate image. |
| Run a separately deployed private converter service | Independent sizing and scaling from voice-serving replicas. | More deployment, authentication, and network failure handling; additional startup and cost considerations. | Not selected: the owner chose a sidecar in the same Container App, accepting shared startup and replica resources. |
| Self-host generative assistance | Control model execution and avoid per-token hosted inference charges. | Adds model operations and potentially substantial memory or GPU costs. | Not selected: the owner chose Azure-hosted on-demand assistance. The converter itself remains locally hosted in the sidecar. |
| Require document-wide preview approval before use | Makes the user explicitly acknowledge a conversion. | Interrupts hands-free use and does not prove that the interpretation is accurate. | Rejected: verbal review while working is sufficient; clarification is targeted to relevant ambiguity. |
| Display numerical correctness confidence without validation | Compact indicator for comparing passages. | An uncalibrated percentage can falsely reassure users about plausible errors. | Not accepted as evidence of accuracy: retain reasoned issue indicators; any later numerical probability requires validation. Exact initial uncertainty behavior remains to be specified. |
| Keep every size prominent in project-specific notes | Avoids generating a focused project view. | Makes the user repeatedly select from values unrelated to the chosen knit. | Not required: preserve every size in the original interpretation while allowing project instructions and notes to focus on the chosen size. |
| Rewrite an existing knit when its size changes | Avoids creating another project. | Risks reinterpreting prior progress and adaptations under a different size. | Not selected: a size change after starting requires a new project; no automatic transfer of completed work. |
| Ask the user for a project name or actual start date | Can produce a personalized name and meaningful knitting date. | Adds setup questions that the owner does not want. | Not selected: generate pattern name plus clock month/year in `mmyyyy` format; keep identity distinct from display naming. |
| Extend or redefine `get_source_text` to serve working instructions | Reuses one tool name. | Adds mode selection or changes the existing original-source contract. | Not selected: add `get_working_instructions` as the normal guidance tool and retain the original-read contract for explicit reference. |
| Load both the complete original and working instructions for every answer | Both representations are immediately in context. | Extra context and latency; increases the chance of mixing original and adapted instructions. | Rejected as normal behavior: working project first, same-project original only when needed to investigate an issue. |
| Retain final working instructions or all source evidence on completion | Preserves future reference and more recovery context. | Extends source retention and changes existing completion cleanup. | Not selected: the owner chose notes-only completion, removing working instructions and source-derived history as well as the PDF. |

The strongest cost counterargument to the selected approach is that a Python
sidecar, generative assistance, and journal replay introduce work beyond simple
text extraction. The selected boundaries reduce some risks but do not prove
the targets achievable: the converter comparison, combined replica measurements,
specific Azure model checks, and explicit operating limits remain prerequisites.

## Additional Resources

### Azure cost constraints

* [Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/):
  Consumption billing, subscription-wide free grants, and scale-to-zero behavior.
* [Container Registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/):
  Registry tier charges, additional storage, and build charges where applicable.
* [Azure OpenAI pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/):
  On-demand token billing versus provisioned capacity; exact model/deployment
  pricing and eligibility remain to be checked if selected.
* [Azure budgets](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets):
  Alerts do not stop consumption; delayed billing data prevents using them as
  real-time spend enforcement.

### PDF conversion prior art

These candidates were initially checked against their project documentation.
Docling and two PyMuPDF configurations have since been evaluated locally against
the representative PDF; see the [comparison](./converter_comparison.md). Other
candidates have not been tested. Advertised layout support is not evidence that
a particular pattern's reading order is preserved.

| Candidate | Relevant mechanism | Constraint to resolve |
| --- | --- | --- |
| [Docling](https://github.com/docling-project/docling) | Local document processing with layout, reading order, tables, and Markdown export; document-analysis and optional visual-language-model capabilities. | Select the actual pipeline and review model licenses, resource needs, and extraction fidelity; do not assume generative interpretation is required. |
| [PyMuPDF / PyMuPDF4LLM](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/) | Layout-aware Markdown and structured extraction, images, and page rendering without requiring an LLM API. | Review AGPL/commercial licensing and evaluate section flow and complete diagram rendering. |
| [pdfplumber](https://github.com/jsvine/pdfplumber) | Text coordinates, tables, drawing objects, and visual debugging without an LLM. | Lower-level extraction requires more assembly to produce coherent sections and evidence links. |
| [Marker](https://github.com/datalab-to/marker) | Document-to-Markdown conversion and image extraction, with different processing modes and optional LLM assistance. | Select and verify a non-generative mode if required; modes differ in model, resource, and licensing requirements. |

Conversion and diagram understanding must be evaluated separately. A tool-only
path may preserve a diagram for user reference without understanding it; a
model-assisted path can still misinterpret it. Neither path removes the need for
source references, uncertainty handling, and verbal clarification.

*Drafted with EGM*
