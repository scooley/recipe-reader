# Layout-Aware Pattern Working Instructions

* **Author:** @scooley
* **Status:** Approved design; implementation not started; release gates outstanding
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
references. A chosen project size is the default, not a rule that every part
must use the same size. Working instructions and notes may focus on that
default while preserving explicit section or value-level overrides. The complete original interpretation and, for PDF
sources, the original PDF remain available for reference rather than being
overwritten by project changes.

The service provides a preview of the instructions and highlights potential
interpretation problems beside the affected content. The voice agent uses the
saved instructions, asks focused questions when details are unclear, and records
changes the user explicitly requests. Verbal review while working is sufficient;
opening the preview or approving every section is not required.

This document extends the existing personal pattern and recipe assistant for
layout-aware pattern PDFs. This phase produces a design only; it does not change
the running service or deploy resources. The owner has approved the high-level
architecture and Detailed Implementation Plan. Approval does not complete the
licensing, compatibility, accuracy, performance, or cost release gates.

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
   size. Support explicit overrides for particular sections, measurements, or
   stitch counts without changing the project's default size. Ask when the applicable size is unclear. Project focus must not destroy
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

## Open Questions and Release Gates

Owner choices are recorded below. The approved contracts and initial operating
limits are consolidated in Detailed Implementation.
There are no existing projects to migrate. These checks remain unresolved and
must not be represented as completed by approving a document:

* Resolve PyMuPDF and shipped-dependency licensing before distributing or
  deploying its container. No commercial license purchase is authorized.
* Verify GPT-5.4 mini's Azure version, Global Standard availability, subscription
  quota, exact API/settings, identity role, prices, and image-token accounting.
  Standard abuse monitoring is accepted; disclose its retention boundary.
* Measure combined Azure/container cold start, conversion, assistance, memory,
  and Builder tool duration against the roughly one-minute preview target.
* Establish representative guidance accuracy, including plausible errors that
  automated checks do not flag. A model or converter self-check is not proof.
* Verify the complete backend cost envelope below $150/month, including the
  shared $25 model budget. Alerts alone are not spend enforcement.
* Verify actual Ravelry size/progress fields only when its future importer is
  built. This effort defines a normalized input boundary, not a working import.

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
GPT-5.4 mini is the selected initial assistance candidate, subject to the release
checks below. A document
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
  conversion. Replacing the default size after starting requires a new project;
  an explicit local size override is an adaptation in the same project.

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
PyMuPDF and the initial Azure assistance candidate have been selected; licensing,
broader downstream accuracy, and actual Azure deployment compatibility remain
gated. Exact API contracts, journal operations, failure limits, and Builder
configuration are specified in Detailed Implementation. No benchmark or deployment has
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

The converter, bounded-review policy, and initial Azure model candidate are
selected below; initial resource allocations are specified in Detailed Implementation
and still require measurement.
The voice agent remains distinct from
document conversion; choosing assistance here does not assume LiveKit Builder
can accept images through existing tool responses.

### Selected assistance discovery: bounded text review

In addition to converter checks, run a bounded model review of extracted
instruction text and section structure to identify suspect passages. Use
bounded follow-up calls for targeted investigation of those passages or
visuals. Do not make whole-document generative retranscription the default.
The review, targeted follow-ups, preparation, and model-assisted modifications
all draw from the same $25 monthly backend model budget, including retries.
There are no separate import, size, or project-lifetime dollar allowances.

The review can miss plausible errors or raise false alarms. Record what was
reviewed and what was not because of input, deadline, or cost limits; absence
of a warning must not be presented as verified accuracy. Unresolved content
retains issue indicators under the clarification-before-use policy. Define
structured review output, checks, prioritization, and call limits in Detailed
Implementation.

### Selected unresolved-content policy: clarify before use

If a passage remains unresolved after conversion and any bounded assistance,
the agent must clarify it before giving the affected instruction as guidance.
Explain the specific ambiguity and consult the active project's original
evidence or ask the user to inspect it. If that does not resolve the ambiguity,
pause the affected step rather than provide provisional instructions or invent
missing details. User willingness to proceed is not evidence that the reading
has been resolved.

Do not block unrelated instructions or require document-wide preview approval.
Keep the issue visible until an attributable clarification resolves it. If the
clarification changes saved instructions, use the selected revision-checked edit
operation; asking a question or reviewing evidence does not itself edit the
document or advance progress. An available page image is not proof that its
diagram has been understood. This policy applies to identified unresolved
content; it does not claim that every interpretation error will be detected.

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
The owner approved one shared $25 monthly ceiling for pattern preparation and
all subsequent backend model-assisted modifications, whatever their kind.
Other category allocations still require a verified
cost envelope that keeps the complete backend below $150.

The repository currently provisions a Basic registry, private Standard LRS Blob
storage, and a Consumption Container Apps environment. Persisted environment
logs are disabled in the template. These facts identify cost categories; they
are not a measurement of current deployed usage or billing. Container Apps free
grants are shared at subscription level and cannot be assumed wholly available
to this project. A Python converter's memory and startup requirements still
need measurement.

The owner replaced the earlier per-import and size-preparation allowances with
this unified monthly budget. Do not retain $0.10 stage caps, a $0.20 project cap,
or page-scaled dollar allowances as active requirements. Bound individual
requests by input/output tokens, image processing, call counts, retries, and
deadlines, reserving their worst-case cost against remaining monthly funds.
Actual cost depends on the deployed model, image inputs, billed reasoning and
output tokens, retries, and use volume. If an operation cannot fit its bounds
or available monthly funds, leave unresolved content flagged or return an
explicit preparation failure rather than silently overrun them. A one-time paid
evaluation also draws from that budget and still needs execution authorization.

Enforce the model ceiling with shared persisted reservations before requests,
not an in-memory counter or Azure billing alerts. Count all projects, stages,
and retries; unresolved or timed-out calls retain their conservative reservation
until usage can be established. Exhaustion stops new model work while preserving
reads of already-saved instructions. This is not a $25 allowance per project
and does not cap hosting, storage, network, or LiveKit billing.

Azure Cost Management budgets send alerts; they do not stop consumption and
billing data is delayed. Therefore a budget alert alone cannot guarantee the
monthly ceiling. Specify bounded resource allocation, request/token/retry
limits, and an action when the remaining operating allowance is insufficient.
Credit eligibility for any future service or marketplace license must be
verified rather than assumed. Costs billed outside Azure must be called out
separately instead of represented as covered by this backend budget.

### Selected assistance hosting: Azure on demand

For expected 2-10-page patterns with roughly one image per page, the planning
estimate for preparation including an initial size-focused copy is roughly
$0.05-$0.15 before retries. This is not a measured cost, guarantee, or new dollar
cap. Later work can include any explicit instruction customization, not only
size changes. An ordinary saved edit that already supplies replacement text
does not need an additional backend model call simply because it is an edit.

Use an Azure-hosted on-demand model for targeted assistance rather than host a
generative model ourselves. Do not provision reserved model capacity. Evaluate a
specific model and deployment for visual input, latency, output fidelity, regional
availability, subscription access, credit eligibility, and pricing within the
shared budget before enabling it. Do not assume a generic model-family name
establishes those properties.

Prefer managed identity where the selected service supports it; verify its
authentication and required role before specifying deployment changes. Keep
model calls in the backend, not browser code or Builder prompts. Data handling
and retention for the selected deployment must be reviewed before sending user
documents. No document transmission or new Azure resources are authorized by
this design discussion.

### Selected assistance processing boundary: Global Standard

Use Azure Global Standard pay-per-token deployment for model assistance. The
owner accepts that inference may be processed in any Azure region; do not claim
that locating the resource in West US 2 confines inference to that region or
to the US. Do not silently substitute reserved capacity or asynchronous Batch.

This selects a processing boundary, not a model or authorization to transmit
the representative PDF. Verify the chosen model version, current pricing,
subscription quota, authentication, and retention/abuse-monitoring behavior
before use. Microsoft's [deployment-type documentation](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types)
distinguishes Global Standard from data-zone and geography-constrained options.

### Selected initial assistance candidate: GPT-5.4 mini

The owner selected GPT-5.4 mini as the initial Azure Global Standard candidate,
conditional on subscription access, budget, latency, and pattern-accuracy checks.
Use it as the candidate for targeted assistance and size-focused generation;
this is not evidence that either task already meets acceptance criteria. See
the [research note](./assistance_model_research.md) for capabilities, lifecycle
considerations, published prices, and unverified assumptions.

Verify the Azure model version and its exact image, structured-output, and
reasoning-setting support before fixing the client contract and deployment.
Do not silently substitute another model if unavailable or automatically
escalate to a more expensive model on failure. Return a failed release check
or leave affected content unresolved under the selected clarification policy.
No model deployment, paid test, or transmission of the sample is authorized
by this selection alone.

### Selected assistance privacy: standard Azure abuse monitoring

The owner accepts Azure's documented standard abuse monitoring, with no
optional conversation or file storage and an explicit retention disclosure.
Use independent inference requests without Assistants, Threads, Files, vector
stores, or stored conversation history. Disable optional response storage in
the selected API and verify that behavior for its deployed version.

This does not disable Azure abuse monitoring. Flagged inputs and outputs may be
retained and reviewed under Microsoft's applicable terms; do not promise zero
retention or imply project completion deletes Microsoft-held monitoring copies.
Do not log document content in application diagnostics. Preview/source
management must disclose this boundary before model-enabled import. Acceptance
of these terms does not authorize transmitting the sample during design work.
See [Microsoft's data-privacy documentation](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy).

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

### Selected undo scope: latest instruction change only

The first version supports undo of only the latest accepted instruction change,
not selective reversal of an older change while retaining newer instruction
changes. Later notes or progress records do not prevent undo because they are
not instruction changes. Reaching an older instruction change requires undoing
newer instruction changes first.

Undo publishes a new revision with an attributable reversal record; it does not
erase history or alter original evidence, notes, or reported progress. Retain
the linked modification summary and record that its instruction change was
reversed rather than silently deleting the summary. Use recorded content for
the reversal without model regeneration. Define the expected-revision and retry
contract in Detailed Implementation. Repeated undo must walk backward through
unreversed instruction changes, not alternate between undoing an edit and
undoing its reversal. Selective undo and redo are outside this initial scope.

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

### Selected default-size change policy: new project after starting

The owner selected size choice when first needed, not as an import prerequisite.
A project import may already supply the default size, including from Ravelry.
Persist its origin and validate its mapping to the pattern's available sizes;
do not ask the user to repeat an unambiguous imported choice. An absent,
unrecognized, or ambiguous imported size remains unset pending clarification.
Verify the provider's actual field mapping when its importer is implemented.

If no usable default is supplied, create the project with all sizes available
in its initial working instructions and no selected size. Allow general
questions and source preview in that state. Before giving size-dependent
instructions, require a validated imported selection or an explicit selection
through voice or the management page and persist it successfully. Do not silently use
the first size, a sample garment's size, or an unsaved conversational assumption.
This does not require asking about size for instructions that do not depend on it.

Establish the applicable size explicitly rather than infer it from the pattern's
sample garment or the first size listed. Preserve all sizes in the original
interpretation; the project's working instructions and notes may focus on the
chosen size.

If the user replaces the project's default size after starting the knit, create a separate project
rather than rewrite the existing project's instructions and history. Do not
automatically transfer progress or adaptations to the new size or mark work as
completed there. Keep the existing project unchanged and follow the existing
explicit project-selection behavior. A new project must not bypass private
source ownership or notes-only completion cleanup through untracked shared
artifacts.

### Selected size model: project default with scoped overrides

Keep a project size and use it consistently by default. Allow explicit
customizations that use another size for a section or a specific measurement
or stitch count. Examples include Small for the yoke, XS for the body, or a
sleeve stitch count taken from Medium. A section can contain more than one
such choice; do not reduce every customization to one section-wide size.

Local overrides are intentional instruction adaptations within the same knit,
including after knitting starts. They do not replace the project default or
trigger the new-project rule for replacing that default. Clarify whether an
ambiguous size-change request means the default or a local customization.

Save each override's scope, referenced source size where applicable, explicit
user intent, and linked instruction revision/modification summary. Use the
selected section-replacement edit mechanism to publish affected instructions
and override metadata together. Preserve unrelated wording and overrides.
Do not silently recalculate adjoining sections or claim that mixing sizes
guarantees compatible stitch counts, fit, or construction. Surface unresolved
dependencies for clarification instead of inventing a repair.

Generation and voice reads must honor overrides ahead of the project default
for their stated scope. Return the default and relevant scoped overrides with
section reads so the agent does not substitute the default back into a mixed
section. The immutable original interpretation retains every source size.

### Selected size-focused instructions: generate a working revision

For a locally created project without imported progress, its first saved
progress report marks the knit as started. This includes setup-only progress
reports under the selected first-progress rule; notes, instruction edits,
source reads, and questions do not count as progress.

Do not use the absence of local progress to classify an imported project as
unstarted. The owner expects most projects to come from Ravelry, where progress
information may already establish that knitting has begun. The future import
boundary must accept normalized imported progress/start status and its origin;
an imported started status applies immediately, before any assistant progress
report. Verify the actual provider fields and mapping when Ravelry plumbing is
implemented rather than invent a percentage threshold now. Missing or
unrecognized imported status is unknown, not evidence that the knit is
unstarted; clarify it before permitting an in-place size change. No separate
local start action is required, and this does not implement a Ravelry importer.

After explicit size selection, produce size-focused working instructions as a
recorded revision rather than keep all-size text and rely on the voice agent to
select values on every read. Preserve the complete all-size original
interpretation unchanged. Record the default size, applicable overrides, and their association with
the generated working revision so reads cannot present instructions for one
size as belonging to another.

Check size order, applicable numeric values, and their associations during
generation. Preserve instructions that do not depend on size and do not guess
when a size/value association is unclear. Keep unresolved passages flagged and
apply the clarification-before-use policy. A readable size-focused result does
not itself establish that the associations are accurate.

This adds a processing and validation step after import when the size is first
chosen. Define its generation mechanism, atomic publication, retry recovery,
and request bounds in Detailed Implementation. Like any backend model-assisted
preparation or modification, it draws from the shared monthly budget and does
not have a separate size allowance. Until size-focused preparation succeeds, do not claim those instructions
are ready. Preparation failure must not discard the existing working document,
notes, or progress. Preserve the selected new-project rule for default-size changes
after knitting has started.

Before knitting starts, permit in-place size regeneration only when there are
no saved instruction adaptations. If adaptations exist, replacing the default size requires
a new project; do not silently reinterpret, discard, or automatically reapply
them for another size. Notes-only modifications do not by themselves establish
an instruction adaptation. Check imported as well as local start status before
allowing regeneration. Exact adaptation-state and retry semantics follow in
Detailed Implementation.

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

### Selected default-size API: dedicated `set_project_size`

Add a dedicated `set_project_size` voice tool to save a missing default size or
explicitly replace it and prepare the working revision. The management page
uses the same server-side validation and preparation, with page authentication.
Future Ravelry imports may initialize the default directly from validated
project metadata through that shared preparation logic; they do not need a
voice-tool call or a redundant size question. If a valid default arrives with
an already-started imported project, initializing it is not a forbidden change
of default size. Existing imported overrides/adaptations must not be erased.

Enforce active-project access for voice requests, revision checking, retry
identity, budget limits, and started/adapted-project rules for replacing an
established default. Use `save_modification` for scoped size overrides with
their section replacements, not the default-size tool. Notes-only calls retain
their existing behavior. Builder must clarify an ambiguous default-versus-local
request before choosing either operation. Exact import fields and mappings
remain part of future Ravelry plumbing, not an integration implemented here.

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

This is the selected logical flow; exact API and storage contracts follow in
Detailed Implementation:

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

* `assistant/src/sources.ts`: preserve supported text-only behavior through
  the new layout-aware converter rather than remove rejection checks
  and pretend flat extraction is sufficient.
* `assistant/src/projects.ts` and `assistant/src/storage.ts`: persist distinct
  original and working artifacts, replay edit history, publish consistent
  revisions using conditional writes, and extend source cleanup.
* `assistant/src/server.ts` and `assistant/openapi.yaml`: define source-based
  project creation for PDF uploads and supported URLs, creation retry/recovery,
  authenticated reads, preview assets, and edit contracts, including compatibility with the
  existing source-text tool. Detailed Implementation specifies these interfaces.
* `assistant/web/`: let the user create a project from a PDF or supported URL
  without a prior naming step; show processing, named working instructions,
  source-appropriate evidence, and issue explanations without a mandatory
  approval screen. Do not require a file for URL input.
* `assistant/builder-instructions.txt`: explain working-copy use, selected size,
  uncertainty, explicit edits, and the difference between changes and progress.
* `assistant/infra/`, container definitions, configuration, tests, and README:
  account for the sidecar, bounded Azure assistance, compatibility, operational
  limits, and setup. Exact file changes follow in Detailed Implementation;
  unresolved release gates do not authorize a different architecture.

### Selected voice-reading policy: active working project first

For normal guidance, read the active project's working instructions, including
its default size, scoped overrides, and saved adaptations. Do not fetch both the complete working
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
default size, relevant scoped overrides, and issue metadata. Define the exact schema and
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

### Selected working-read scope: section index, then requested sections

Use section-based reads rather than returning the complete working document by
default. An initial `get_working_instructions` call returns the active project's
section index with stable section IDs, ordering, current revision, selected size
or its unset state, and issue summaries. Subsequent calls request sections by
their stable IDs and return their instruction text, relevant issues, source
references, and linked project notes. Include project-wide notes that affect
guidance even when they are not attached to a particular section.

The agent must fetch additional sections when guidance depends on them; a
section boundary does not prove that the instructions are self-contained.
Cross-column continuations within a logical section remain together, and
section references must not be silently discarded during normalization. This
approach reduces routine context size but adds tool calls and can omit needed
context if the agent fails to follow dependencies.

Every response identifies the project and revision. Define revision-consistent
follow-up reads, section count and response-size limits, and explicit handling
of an oversized section in Detailed Implementation. Do not silently truncate
instructions or combine sections from different revisions as if they were one
consistent read. Preserve the active-project boundary and the selected
clarification-before-use policy for unresolved instructions.

### Implementation contract and unresolved measurements

The approved Detailed Implementation section below specifies exact contracts and
bounded initial execution settings. The converter comparison and owner decisions
are inputs to that plan, not evidence that the final service meets its targets.
Unsuccessful licensing, Azure capability, accuracy, latency, or cost gates stop
release; they do not authorize a silent architecture or model substitution.

## Alternatives Considered

These alternatives come from the concept brief and subsequent owner decisions.
"Not selected" describes this design's scope, not a claim that the alternative
cannot work elsewhere. The agreed local comparison has since been performed, and the owner selected
heuristic PyMuPDF as the baseline. Docling remains a documented alternative,
not an additional production dependency.

| Alternative | Benefit | Drawback or failure condition | Decision and reason |
| --- | --- | --- | --- |
| Remove the current PDF extractor's image and column rejection checks | Small code change; accepts more files. | Does not solve column ordering, size associations, or missing diagram overlays. | Rejected: accepting a file is not adequate support for its instructions. Preserve supported text-only behavior through the selected converter. |
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
| Display numerical correctness confidence without validation | Compact indicator for comparing passages. | An uncalibrated percentage can falsely reassure users about plausible errors. | Not accepted as evidence of accuracy: retain reasoned issue indicators; any later numerical probability requires validation. Withhold known ambiguous passages from guidance until clarified, without blocking unrelated instructions. |
| Keep every size prominent in project-specific notes | Avoids generating a focused project view. | Makes the user repeatedly select from values unrelated to the chosen knit. | Not required: preserve every size in the original interpretation while allowing project instructions and notes to focus on the chosen size. |
| Replace the default size of an existing knit after starting | Avoids creating another project. | Risks reinterpreting prior progress and adaptations under a different default size. | Not selected: replacing the default after starting requires a new project; explicit local size overrides remain supported adaptations in the same knit. |
| Ask the user for a project name or actual start date | Can produce a personalized name and meaningful knitting date. | Adds setup questions that the owner does not want. | Not selected: generate pattern name plus clock month/year in `mmyyyy` format; keep identity distinct from display naming. |
| Extend or redefine `get_source_text` to serve working instructions | Reuses one tool name. | Adds mode selection or changes the existing original-source contract. | Not selected: add `get_working_instructions` as the normal guidance tool and retain the original-read contract for explicit reference. |
| Load both the complete original and working instructions for every answer | Both representations are immediately in context. | Extra context and latency; increases the chance of mixing original and adapted instructions. | Rejected as normal behavior: working project first, same-project original only when needed to investigate an issue. |
| Retain final working instructions or all source evidence on completion | Preserves future reference and more recovery context. | Extends source retention and changes existing completion cleanup. | Not selected: the owner chose notes-only completion, removing working instructions and source-derived history as well as the PDF. |

The strongest cost counterargument to the selected approach is that a Python
sidecar, generative assistance, and journal replay introduce work beyond simple
text extraction. The selected boundaries reduce some risks but do not prove
the targets achievable: the converter comparison, combined replica measurements,
specific Azure model checks, and explicit operating limits remain prerequisites.

## Reconciliation with the Concept Brief

No unresolved contradiction remains with the brief's confirmed decisions:
editable Markdown, logical sections, retained size and visual evidence, preview,
voice clarification and changes, and no mandatory approval screen are preserved.
The brief explicitly labels its remaining boundaries and mechanisms as proposals,
not an approved implementation plan. Later owner approvals resolve those choices:

* The proposed exclusion of a rewritten size-specific pattern is superseded by
  approved size-focused working revisions. The immutable original keeps all sizes;
  a project default permits explicit section- and value-level overrides.
* The proposed full-copy-first retrieval is superseded by the approved section
  index and requested-section reads, including shared context and dependencies.
* Proposed legacy migration is unnecessary because the owner confirmed there are
  no existing projects. Schema 2 applies to new records; older API contracts remain
  available, but a schema-1 image is not a compatible rollback.
* Proposed retention of the old PDF extractor is superseded by the approved plan
  to preserve supported text-only behavior through the selected converter. Merely
  weakening the old extractor's layout guards remains rejected.
* Background processing and full snapshots per edit were alternatives, not binding
  brief decisions. The owner selected request-bound work and a journal with periodic
  checkpoints; failed measurements return for a decision rather than change these.

Architectural, interface, and dependency additions beyond the brief are approved
in the corresponding decision sections and implementation items:

| Addition | Scope and boundary |
| --- | --- |
| Heuristic PyMuPDF Python sidecar | Separate pinned runtime in the same Container App, private conversion API, full-page evidence, no new public converter service. |
| Azure GPT-5.4 mini Global Standard candidate | Managed-identity inference, bounded review and targeted assistance, accepted standard abuse monitoring, optional response storage disabled, shared monthly reservations. Deployment compatibility and licensing remain gates. |
| Versioned document publication | Markdown/metadata pairs, stable IDs, conditional root publication, exact journal replay, latest-only undo, bounded recovery receipts and cleanup fencing. No new database or durable job queue. |
| Source-based creation | PDF and existing supported HTML routes, automatic names, normalized future imported size/start metadata. No Ravelry integration or general URL-to-PDF acquisition. |
| Working instruction tools and preview | Section reads, default-size tool, extended modification tool, revision checks, authenticated page images, and coordinated Builder rollout. Original-source reads retain their meaning. |
| Operating and lifecycle contracts | Explicit processing/resource limits, admission and cancellation, notes-only completion, retry recovery, privacy disclosure, and measurable release checks. No authorization to deploy, purchase, or transmit the sample. |

## Detailed Implementation Plan

This is the approved implementation contract, not production code or permission
to deploy. Implement the files below as one coordinated feature. Do not add a
queue, another database, a generic importer framework, or a Ravelry integration.
All limits in this section are approved initial engineering bounds;
performance and compatibility gates must validate them before release.

### 1. `assistant/src/documents.ts` - create: document model and deterministic history

Define the shared types and runtime validators for Markdown plus companion
metadata. Keep knitting prose authoritative; do not introduce a knitting grammar.

* A document has a format version, stable document ID, ordered sections, a
  content hash, and a journal sequence. A section has a server-assigned stable
  UUID, heading, Markdown, ordered source references, and explicit section
  dependencies when identified. Heading edits do not change section IDs.
* Source references are PDF page numbers or a checked webpage URL with a text
  heading/paragraph reference. Do not invent PDF pages for HTML or expose storage
  paths. Store original PDF SHA-256 separately from extracted-text SHA-256.
* Metadata includes the available size labels in source order, optional default
  size and its origin, scoped overrides, issue records, and review coverage.
  An override identifies its section, textual target, optional source size, and
  associated modification ID. Several overrides may apply within one section.
* Issues have stable IDs, a reason, affected section/passage, source references,
  status, and resolution attribution. Text offsets refer to the current section,
  not PDF regions. Reasons include reading order, size association, missing
  content, unit/table association, visual interpretation, and edit dependency.
  Coverage not reviewed is reported separately from a known blocking ambiguity.
* Preserve 100,000 instruction characters per document, at most 200 sections and
  200 issues, and at most 100 scoped overrides. Reject excess explicitly; never
  silently truncate content, sizes, references, or unresolved issues.
* A journal entry records operation ID, sequence, predecessor/content hashes,
  category, actor class, timestamp, modification link, and exact before/after
  content and metadata for affected sections. Apply entries deterministically
  and fail with `503 invalid_working_document` on missing entries or hash errors.
* Write a matching full Markdown/metadata checkpoint at initial preparation and
  every tenth instruction mutation. A normal read replays at most nine entries.
  Keep earlier entries for inspection and undo until completion/deletion. Bound
  source-derived edit history at 64 MiB per project; reject further writes with
  `409 history_limit` rather than silently delete recovery information.
* Undo targets the latest unreversed user instruction change, including an
  extraction correction or scoped override. Record its inverse as a new entry
  and mark the linked summary reversed. Repeated undo walks backward; it does
  not undo its own reversal. Notes-only changes and initial/generated preparation
  baselines are not user edits. Replacing a default size uses `set_project_size`,
  not undo. There is no selective undo, redo, or automatic history pruning.

### 2. `assistant/converter/requirements.in` and `assistant/converter/requirements.lock` - create: pinned converter dependencies

Declare the tested `pymupdf==2.1` and `pymupdf4llm==2.1` direct dependencies.
Generate a complete hash-locked production dependency set using the available
package resolver; do not copy the Docling evaluation environment's full lock.
Review every shipped dependency's license, including layout components installed
transitively even though their model is disabled. Install only from the lock.

### 3. `assistant/converter/worker.py` - create: isolated PDF conversion

Set `pymupdf4llm.use_layout(False)` explicitly before conversion. Use page-chunked
Markdown with OCR disabled; use PyMuPDF full-page rendering for visual evidence.
Do not export bare embedded photographs as the only diagram representation or
download model weights at startup. Process untrusted PDFs in a killable child
process, not the HTTP server's serving thread.

* Accept a PDF of at most 25 MiB, 1-60 pages, with at most 100,000 extracted
  characters. Reject encryption requiring a password, malformed documents,
  unreadable instruction pages, and unsupported scans explicitly. An illustration
  page without text may accompany readable instruction pages; do not reject it
  solely because that individual page lacks the old 40-character minimum.
* Render complete pages at 150 DPI, reducing resolution to keep each page within
  4 million pixels and the document within 120 million pixels. Process one page
  at a time. Limit each PNG to 8 MiB and all conversion artifacts to 128 MiB.
  If a legible evidence image cannot fit, report `422 evidence_limit`; do not
  clip labels or silently omit the page.
* Return page text, ordered line IDs, link destinations, basic page/visual facts,
  content hashes, converter version/configuration, and local page asset IDs.
  Keep arbitrary source filenames and paths out of filesystem destinations.
* Hard-stop the child after 25 seconds or cancellation, remove its temporary
  directory, and return a typed failure. Cap process memory with the container
  limit; treat an OOM/restart as a failed conversion, not successful empty output.

### 4. `assistant/converter/app.py` - create: private converter HTTP boundary

Use the Python standard-library HTTP server and worker processes rather than add
a web framework for these internal operations. Listen on port 8081 on the
container network interface so Container Apps probes can reach it; expose no
ingress or additional external port for this container. Deno calls loopback.

* `GET /healthz` reports process availability; busy is not unhealthy.
* `POST /convert` accepts bounded PDF bytes and returns a small conversion
  manifest and opaque conversion ID. Reject a second conversion with `429`.
* `GET /conversions/{id}/pages/{number}` returns an already-generated PNG.
  `DELETE /conversions/{id}` releases its temporary files. Neither route accepts
  an arbitrary file path or remote URL. Expire unreleased results after 120
  seconds and sweep them on subsequent requests; no durable work continues.
* Parse content length before reading; reject oversized/missing-length bodies.
  Drain/terminate the child on timeout. No document text, images, access tokens,
  or raw upstream response bodies enter logs.

### 5. `assistant/converter/Dockerfile` - create: independently built sidecar

Use a pinned Python 3.12 slim image, a non-root user, hash-checked dependencies,
and a bounded writable temporary directory. Build for Linux amd64. Include only
the worker, HTTP app, and required runtime packages. Do not put source PDFs,
evaluation outputs, vault data, or model caches into the image. Licensing is a
distribution/deployment gate, not a comment that waives obligations.

### 6. `assistant/src/converter.ts` - create: bounded sidecar client

Expose an injectable converter transport for tests. Use only a validated
loopback base URL and a 30-second conversion timeout inside the parent request
deadline. Validate every manifest field, page count, asset ID, byte count, and
hash. Fetch and stage page assets serially without constructing remote URLs
from document text. Always request temporary-result cleanup; surface a cleanup
failure distinctly rather than hide it in a broad catch. Sidecar failure must
not fall back to the known-bad flat multi-column extractor.

### 7. `assistant/src/sources.ts` - modify: retain public URL safeguards and support PDFs through the converter

Replace the production PDF extraction path with the converter client for both
text-only and layout-bearing PDFs. Preserve supported text-only input behavior,
not the old implementation's image/column rejection. Remove pdfjs-specific
worker/operator handling instead of retaining a second unused PDF parser.
Keep public HTML fetching's DNS validation, pinned connection, TLS hostname,
no redirects/credentials/subresources, 2 MiB limit, and 100,000-character limit.
Do not start downloading HTML images or accept arbitrary PDF URLs in this
effort. An acquired PDF and an HTML page are distinct content formats.

### 8. `assistant/src/model-budget.ts` - create: shared monthly reservations

Persist one conditional-write ledger under `state/model-budget/YYYY-MM.json`,
using UTC months and integer micro-US-dollars. Its limit is $25, shared across
all preparation, model-assisted modifications, evaluation, and retries performed
by this backend. Ordinary persistence of supplied edits incurs no model call.

* Before each call, reserve a conservative upper-bound cost using the verified
  deployment prices, complete prompt envelope, image token bound, and maximum
  billed output/reasoning tokens. Do not assume cache discounts. Never dispatch
  a call whose reservation would exceed remaining funds.
* Identify each reservation by operation/attempt/call ID. CAS conflicts cause a
  bounded re-read/retry, never a second independent allowance. Settle confirmed
  usage once; keep the full reservation on timeout, lost response, or unknown
  usage. Failed requests may still have cost money.
* A response exceeding its reserved token envelope freezes further model work
  with `503 budget_accounting_error` until configuration/accounting is reviewed.
  Store counts and request IDs, not prompt or completion content, in the ledger.
* Do not begin a model call in the last two minutes of a UTC month; return the
  next eligible time so a bounded request cannot straddle accounting months.
  Limit ledgers to 10,000 reservations per month and fail explicitly if full.
* Exhaustion returns `model_budget_exhausted`. Existing instructions, notes,
  progress, and supplied instruction edits remain usable. The browser displays
  the remaining conservative allowance, not a prediction of the Azure invoice.

### 9. `assistant/src/assistance.ts` - create: managed-identity model adapter

Use the existing `@azure/identity` dependency and the app's managed identity.
Call Azure's v1 Chat Completions endpoint with bearer authentication, image data
provided directly, strict JSON-schema output, `store: false`, and no tools,
remote image URLs, stored conversations, Files API, or automatic model fallback.
Use a configured, verified GPT-5.4 mini deployment/version. Initially request
low reasoning effort; block release if the Azure version does not support the
specified contract instead of silently changing settings.

Bound a call to 128,000 conservatively counted input tokens, 8,000 maximum
completion tokens including billed reasoning, at most ten high-detail page
images, and 30 seconds. Bound an entire preparation request to three model
attempts total, including at most one retry. Retry only an explicit retryable
429/5xx response while time and reserved funds remain. Do not automatically
repeat a call after an ambiguous network timeout. All calls pass through the
shared budget adapter; no separate size or import dollar cap remains.
Reserve at least ten seconds of the parent deadline for persistence/cleanup;
shorten or skip a model attempt that cannot leave that time. A three-attempt
limit is a maximum, not a promise that three full 30-second calls will fit.

Treat source text as untrusted data. Structured output must reference existing
line/section/page IDs and pass local coverage/type checks. Invalid JSON, refusal,
content filtering, invalid references, missing usage, and truncation have
distinct outcomes. Never accept a partially generated instruction document.

### 10. `assistant/src/preparation.ts` - create: one source-preparation path

Combine checked PDF/HTML evidence, bounded model review, targeted assistance,
document validation, and optional default-size preparation. Return a candidate;
only `Projects` publishes it. Inject converter/model transports for offline tests.

* Build initial all-size Markdown from converter or checked HTML text. Assign
  line IDs before asking the model for section boundaries and issue discovery.
  Validate ordered, non-overlapping coverage of all instruction lines. Never
  accept model-declared completeness without this check. Preserve an unsectioned
  passage explicitly with a structural issue if boundaries remain uncertain.
* Retain original extraction alongside normalized all-size interpretation.
  Preserve every size sequence, unit association, link destination, and source
  page. Any proposed rewrite of evidence must be separately recorded; the raw
  evidence is immutable. Do not repair arithmetic or remove apparent duplicate
  attribution/footer text without retaining the original and identifying it.
* Use remaining bounded calls for identified passages or annotated visuals.
  Decorative photos do not automatically require analysis. Preserve all page
  evidence whether or not a model examined it. Record incomplete review coverage
  and known unresolved passages distinctly; neither means verified accuracy.
* When a validated default is available, prepare focused working sections using
  that default plus explicit scoped overrides and previously accepted corrections.
  Supply the current working revision and relevant correction history alongside
  all-size evidence; do not silently reintroduce a corrected extraction error
  when preparing another permitted default. Validate size labels and numeric
  preservation/associations; unknown mappings stay blocked for clarification.
  Never promise deterministic checks prove semantic equivalence.
* A model budget/follow-up failure may leave a complete converter-derived preview
  with explicit unresolved/coverage issues. Failure to obtain a complete readable
  source, a consistent document pair, or required evidence fails preparation.
  Failure of a requested default-size revision preserves the prior working copy.
* Name precedence is a defensible detected pattern title, then a sanitized PDF
  filename or checked webpage title, then `Pattern <short-project-ID>`. Append
  creation month/year in UTC `mmyyyy` once. Flag fallback naming without asking a
  naming/date question. Names are display labels, never identity or file paths.
* Accept normalized internal origin metadata: acquisition kind, external project
  reference, optional default-size label, and imported start/progress status with
  provenance. Ravelry field mapping and authenticated acquisition remain future
  work. Public upload/URL callers cannot claim verified Ravelry provenance.

### 11. `assistant/src/operations.ts` - create: bounded attempt receipts, not jobs

Provide payload fingerprinting, attempt IDs, deadlines, and receipt validation.
New browser imports use a client-generated UUID retained in session storage;
voice mutations derive retry identity server-side from project ID, original
expected revision, operation kind, and canonical validated payload. The agent
does not invent resource IDs or need a second tool merely to obtain a retry ID.

A receipt contains identifiers, input hash, deadline, and outcome, not pattern
text. Lookup never resumes work, queues a job, or automatically incurs a model
call. Identical retries return the confirmed outcome or explicit in-progress/
uncertain/failed state; a different payload under the same import ID returns
`409 idempotency_conflict`. A timeout is not proof of failure. Retain recovery
receipts for 30 days; never expire an attempt whose source cleanup is unresolved.

### 12. `assistant/src/projects.ts` - modify: publish source, working copy, and notes consistently

Use schema 2 for newly created records; no schema-1 migration/upgrade UI is
needed. Add an internal `preparing` state hidden from normal project lists and
selection. Preserve existing public open/completed behavior and explicit active
selection. Creating from a source must not select the new project automatically.

Store source-derived files beneath `projects/{id}/sources/{source-id}/`:
original PDF when applicable, raw extraction, all-size original Markdown and
metadata, page renders, working checkpoints, and journal entries. Do not put
instruction bodies into retained root notes or operational receipts.

**Publication and retry contract:**

1. Claim a bounded attempt and validate project state/revision before model work.
   A new import creates only a hidden preparing root and its recovery receipt.
   Existing-project preparation records its pending attempt while retaining
   the last published working version for reads.
2. Save immutable candidate artifacts using `ifNoneMatch`. Check request deadline
   and closed-project fencing before each write. Persist matching hashes and a
   manifest; a normal edit writes only its journal entry, plus a periodic
   checkpoint when due, not a full document snapshot on every edit.
3. Conditional-write the root `project.md` once to publish the document manifest,
   default/override metadata, linked modification summary, and operation receipt
   together. Its ETag is the commit boundary. All other root mutations increment
   the same existing project revision; no automatic rebase is performed.
4. On ambiguous storage response, re-read the root and match the operation ID
   before reporting failure or deleting candidates. If its outcome cannot be
   verified, return an uncertain result and retain recoverable staged artifacts.
   Never clean up files that the root may reference.
5. On a confirmed conflict, do not overwrite newer notes/instructions or repeat
   paid work automatically. Remove only confirmed-unreferenced candidates;
   report cleanup failure explicitly with the attempt ID for recovery.

`save_modification` retains its existing notes fields and accepts optional
`instructionChange`, a discriminated union:

* `replace_sections`: category `correction` or `adaptation`, 1-10 unique section
  IDs with complete replacement Markdown, explicit override upserts/removals,
  and any issue resolutions with their clarification/evidence summary.
* `undo_latest`: the target change ID returned by the working read. Reject it
  if it is no longer the latest eligible change. The server supplies the exact
  inverse from history; the agent must not regenerate old text.

Both variants require the existing expected project revision. Notes-only calls
omit `instructionChange` and do not touch working text. Bound the total resulting
document to 100,000 characters, preserve untouched sections, and reject unknown
IDs, conflicting override scopes, and contradictory resolution requests. A
changed passage invalidates affected review metadata; never silently clear a
warning because its old text offsets stopped matching.

`set_project_size` accepts expected revision and an exact source-size label.
Initialize a missing default even if the project is already started, while
replacing an established default obeys the selected started/adapted-project
rules. Validated imported defaults initialize
through the same logic without redundant questions. Imported started status or
any local progress report establishes started; unknown imported status requires
clarification before replacing a default. An unknown status can be resolved by
an explicitly confirmed user statement passed with this operation. Scoped
overrides remain ordinary instruction adaptations, not default replacements.

Completion first closes the project, fences new writes, and cancels pending
local preparation. Do not claim full cleanup while an attempt can still write:
drain it within the request deadline or return `partial_completion` with retry
information. A crashed attempt requires deadline/quiescence recovery and confirmed
cleanup; a timeout alone is not deletion evidence. Delete the entire source
prefix, clear working/default-derived references and pending operation payloads,
and preserve only attributable notes, progress, modification summaries, and
follow-ups. Keep override descriptions only as modification summaries, not old
instruction text. Explicit project deletion removes retained notes as well.

Do not implement in-place source replacement or reconversion merging. A different
source or requested fresh conversion creates a new project; no automatic transfer
of progress or adaptations. This keeps immutable evidence and existing cleanup
ownership intact.

### 13. `assistant/src/storage.ts` - modify: bounded enumeration and cancellation

Preserve conditional put/delete semantics and managed identity. Add hierarchical
prefix enumeration so listing projects does not enumerate every page image and
journal blob. Implement the same behavior in MemoryStore for tests. Keep the
26 MiB per-object read limit; individual new artifacts must fit it. Add abort
signals and bounded SDK request/retry settings to preparation-related I/O, and
explicitly distinguish uncertain writes from confirmed conflicts. Completion
and failed-attempt cleanup enumerate the full source prefix, not only manifest
members, so uncommitted artifacts are included.

### 14. `assistant/src/server.ts` - modify: source creation, working reads, and recovery routes

Keep existing authentication classes. New shared routes inspect the authorized
actor: enforce active-project access for voice, while the owner page can preview
its selected project without switching the voice project. Do not broaden page
asset access to the agent bearer. Keep existing API contracts unless specified.

| Route | Access and contract |
| --- | --- |
| `POST /v1/projects/from-pdf` | Page; multipart PDF and import ID; create and prepare a named project; return `201` only after publication. |
| `POST /v1/projects/from-url` | Page; JSON checked webpage URL and import ID; same preparation/publication path. |
| `GET /v1/import-attempts` and `GET /v1/import-attempts/{id}` | Page; bounded recovery receipts and cleanup-needed state, not document payloads or background-job polling. |
| `POST /v1/import-attempts/{id}/cleanup` | Page; retry confirmed-unreferenced staged-source cleanup; do not delete published source. |
| `GET /v1/projects/{id}/working-instructions` | Shared; no section IDs returns an index; section reads require the index's expected revision and 1-4 stable section IDs. |
| `POST /v1/projects/{id}/size` | Shared; `set_project_size`, using expected revision and exact size label; same retry/recovery rules as other mutations. |
| `GET /v1/projects/{id}/source-pages/{page}` | Page; authenticated PNG from that project's available source; no arbitrary storage key. |
| `GET /readyz` | Public; process and sidecar availability, not a claim of ongoing Blob or model health. Busy conversion alone is not failure. |

Working responses identify project/revision, default size and origin, scoped
overrides, relevant notes, source references, coverage, issue reasons, and latest
undoable change. Return current ordered section dependencies in the index.
Paginate notes in groups of 20 with a revision-bound cursor; indicate remaining
pages explicitly. Include project-wide context and current progress, not only
section-linked notes. Total instruction text remains bounded by the document's
100,000-character limit and serialized response by 1 MiB. No silent truncation.

Known blocking passages are withheld from `guidanceMarkdown` and represented
by issue placeholders. Return their source references and ambiguity explanation
separately for clarification; page preview can still show the evidence. Unaffected
passages remain available. An unresolved default/override mapping blocks only
guidance depending on that mapping. On a revision change, return `409` rather
than combine sections or note pages from different revisions.

Retain `get_source_text` as the active project's original, all-size reference.
Retain original create/attach APIs for explicit notes-only/older-client usage;
the new page uses create-from-source, not a mandatory prior title step. Preserve
Ravelry routes' `501` until their separate integration exists.

Keep the 25 MiB multipart input bound and 16 KiB ordinary JSON bound. Permit up
to 512 KiB only on validated instruction-edit bodies; resulting text limits
still apply. Use a 105-second preparation deadline from accepted request through
publication, a 120-second browser timeout, and one admitted preparation at a
time. A conditional shared admission record and its fixed expiry cover revision
overlap; local-only locks are insufficient. Reject concurrent preparation with
`429 preparation_busy` and Retry-After, rather than queue it. Notes/reads remain
available. Once the parent deadline expires, no new model/storage writes begin.

### 15. `assistant/src/config.ts` and `assistant/src/main.ts` - modify: explicit runtime configuration

Add validated loopback converter URL, assistance enablement, Azure model endpoint,
deployment/version, and verified pricing configuration. Require real model
settings only when assistance is enabled; disabled assistance is visible in
preview coverage and is not reported as a successful review. Keep the $25
ceiling and request limits centralized, not separate size/import settings.

Construct the shared budget, converter, and assistance transports once. Reuse
managed identity configuration without introducing a PAT, model API key, or new
vault secret. Preserve startup's private-container check. Wire cancellation,
admission recovery, and readiness; do not start a worker queue or sweeper daemon.

### 16. `assistant/openapi.yaml` - modify: complete external schemas

Describe all new routes, response limits, nullable default size, mixed overrides,
review coverage, blocked guidance, notes pagination, operation outcomes, and
typed errors. Extend `save_modification` with the optional union while retaining
notes-only callers. Set operation IDs `get_working_instructions` and
`set_project_size`. Internal import provenance fields are not public assertions
of verified Ravelry data. Document synchronous tool duration and uncertain results.

### 17. `assistant/builder-instructions.txt` - modify: working-first voice behavior

Replace both full-original-read rules with section-index then relevant-section
reads. Load dependencies and project-wide context; fetch subsequent note pages
when context remains. Reuse the response revision and never answer from another
project after a switch. Use original text only for explicit same-project source
comparison. State relevant defaults and overrides without repeating every size.

Persist a missing default through `set_project_size` only when needed; do not
re-ask an unambiguous imported size. Use section replacements for explicit
corrections/adaptations, including local size choices; notes and progress retain
their meanings. Resolve blocked passages before using them. On stale revision,
reload and reconcile intent; on uncertain writes, preserve the original retry
identity/payload and check the returned state before replaying. No silent rebase,
invented arithmetic, cross-project reads, or full-pattern recitation.

### 18. `assistant/web/index.html`, `assistant/web/app.ts`, and `assistant/web/styles.css` - modify: source-based creation and preview

Provide PDF and URL creation paths without a mandatory naming form or empty
project. Keep explicit voice selection and exact-title deletion. Distinguish
upload progress from indeterminate processing; never invent completion percent.
Retain each import ID through timeout/refresh recovery and show cleanup-needed
attempts with a retry control. Do not automatically submit a new import ID after
a lost response or imply Ravelry import works today.

Show the working document name, default and scoped overrides, section navigation,
linked notes, revision, review coverage, and specific issues beside instructions.
Use semantic headings plus text-safe Markdown blocks for this version; do not
add an HTML-capable Markdown renderer. Fetch original-page PNGs with the owner's
Entra token, display through revocable blob object URLs, and revoke them on
project switch, completion, sign-out, and view teardown. Permit `blob:` only in
CSP `img-src`; never put tokens in URLs or fetch untrusted Markdown image links.
Lazy-load pages and keep at most four page images in browser memory. The default
selector uses the shared server operation; there is no mandatory preview approval.
Preserve the existing system light/dark theme and keyboard/status accessibility.

### 19. `assistant/deno.json`, `assistant/deno.lock`, `assistant/Dockerfile`, and `assistant/.dockerignore` - modify: build integration

Remove pdfjs-dist after its production path is replaced; retain pdf-lib for
synthetic tests. Regenerate the Deno lock with the package manager. Add targeted
test tasks only as needed and include new modules in check/lint/build coverage.
The Deno image remains Deno-only, with no process-execution permission. Do not
copy converter tests or Python dependency caches into either runtime image;
use the converter Dockerfile for the separate build from the assistant context.

### 20. `assistant/infra/assistance.bicep` - create: optional identity-authenticated model resource

Define an Azure OpenAI resource and a GPT-5.4 mini Global Standard deployment,
with explicit verified region/version/quota parameters and no reserved capacity.
Disable local-key authentication. Grant the existing runtime managed identity
the resource-scoped Cognitive Services OpenAI User role; do not grant it broad
resource-group management rights. Output only non-secret endpoint/deployment
configuration. Do not provision Files, vector stores, or conversation services.
No region/model substitution or paid deployment occurs during design work.

### 21. `assistant/infra/service.bicep` and `assistant/infra/service.example.bicepparam` - modify: two-container deployment

Reference the optional assistance module and add its non-secret environment
configuration. Add the converter image/tag and loopback port without external
ingress. Proposed starting allocation is Deno 0.5 CPU/1 GiB plus converter
0.25 CPU/0.5 GiB, total 0.75 CPU/1.5 GiB per replica; retain zero-to-one replica
scaling. This is a measurement candidate, not established sizing. Do not silently
increase resources if combined tests fail.

Use `/healthz` for Deno startup/liveness and `/readyz` for readiness; add sidecar
startup/liveness probes. Do not use model calls or per-probe Blob requests for
health. Keep private registry pulls, storage access, and browser/voice auth
unchanged. No edit to the ignored `service.local.bicepparam` is part of the plan.

### 22. `assistant/.env.example` and `assistant/README.md` - modify: configuration, operations, and Builder rollout

Document both image builds, verified model parameters and managed-identity role,
license prerequisite, shared model budget/reservations, request bounds, failure
recovery, source retention, privacy disclosure, and remaining release checks.
Add exact Builder steps: import the revised tool schemas, configure the two new
tools and extended modification tool, replace the working-first instructions,
retain the original-reference tool, and verify synchronous timeout support.
No new secret is needed for Azure model authentication; retain the existing
Builder bearer handoff through the local Swamp vault.

Deploy backend/schema changes and Builder configuration as a coordinated rollout.
Old Builder prompts continue to read originals and do not support the new
experience. A schema-1 backend image is not a safe rollback after schema-2
records are published; use a compatible schema-2 image/forward fix. Do not add
migration machinery for nonexistent old projects. Verify the Azure request and
Builder timeout limits before claiming voice size preparation is usable.

### 23. Focused test files - create/modify: offline correctness and failure recovery

* Modify `assistant/tests/service.test.ts`: existing auth/progress/notes/deletion
  behavior; new route access classes and active-project checks; create-from-source
  without visible empty projects; original API compatibility; known unresolved
  guidance withholding; size/default/override rules; imported size/start metadata
  using internal synthetic inputs, not a fake functioning Ravelry API.
* Create `assistant/tests/documents.test.ts`: stable section IDs; exact journal
  replay/checkpoints; repeated latest-only undo; linked notes unchanged; mixed
  sizes within one section; stale issue offsets; missing/corrupt history; source
  and working hashes kept distinct. Use synthetic prose, not purchased content.
* Create `assistant/tests/preparation.test.ts`: injected converter/model results,
  section/line coverage, all-size preservation, default with scoped exceptions,
  naming fallback, incomplete review, refusal/truncation, deadlines, and no model
  work on ordinary supplied edits. Check complete candidate rejection, not just
  constant values or stub success.
* Create `assistant/tests/model-budget.test.ts`: concurrent CAS reservations,
  cross-project shared exhaustion, duplicate settlement, ambiguous timeout debit,
  billed reasoning tokens, month boundary, and over-envelope fail-closed behavior.
* Create `assistant/tests/converter.test.ts`: manifest/asset validation, byte
  limits, cancellation, sidecar errors, and no external URL/path traversal.
* Create `assistant/converter/converter_test.py`: generate permission-cleared
  PDFs in memory with PyMuPDF; verify real heuristic-mode two-column continuation,
  an illustration-only page, eight-size values and metric/imperial associations,
  and full-page arrows/labels. Test malformed/encrypted/oversized inputs and
  worker timeout/cleanup. Do not keep purchased PDF fixtures in the repository.

In service tests inject storage failure before and after each publication point,
lost successful responses, concurrent edits, completion/deletion during pending
preparation, late writes, and cleanup retry. Assert no duplicate operation,
published partial document pair, erased adaptation, or falsely confirmed cleanup.
Known-bad fluent ordering with all numbers preserved must fail the evaluation;
checking number counts alone is not sufficient.

### 24. Verification and release gates - execute during implementation, not as design claims

Run the smallest focused tests during each change, then the existing assistant
tasks `check`, `fmt`, `lint`, `test`, and `build:web`. Run Python unittest discovery
against `assistant/converter/converter_test.py` with the locked dependencies and
bytecode writes disabled. Compile both Bicep templates and build both Linux amd64
images; resolve dependency changes through their package managers. No new test
framework or persistent developer server is required.

Before release, require all of the following:

* Documented applicable PyMuPDF/transitive licenses and distribution obligations.
* Azure deployment/version/quota, managed-identity access, structured outputs,
  image accounting, reasoning settings, and optional-storage behavior verified
  using authorized synthetic calls. No purchased sample transmission without
  separate permission. Model evaluation charges count toward the shared budget.
* A bounded permission-cleared evaluation set covering 2-, 4-, and 10-page layouts,
  cross-column continuations, all sizes/units, vector overlays, selective overrides,
  and unresolved diagrams. Require every enumerated expected fact and grounded
  test answer to match the fixture or explicitly abstain; any unflagged wrong
  expected fact blocks release. This is not a universal correctness probability.
* Measure cold and warm end-to-end four-page preview latency, both containers'
  memory/CPU, three-call worst-case behavior, concurrent voice reads, and actual
  token/cost usage. Target roughly 60 seconds; hard deadlines remain independent.
  If the representative path cannot meet the target safely, return to the owner
  rather than add background jobs, a larger model, or larger resources silently.
* Verify browser preview, sign-out image disposal, mixed-size voice guidance,
  issue clarification, latest undo, lost-response recovery, and complete cleanup
  through the real configured Builder. Confirm its tool timeout can accommodate
  request-bound preparation; otherwise block this rollout for a design decision.
* Calculate the complete monthly envelope at current regional rates without
  assuming shared free grants or credits. Include a continuously active maximum
  replica, registry, $25 model usage, retained source/history capacity, failed
  attempts, storage transactions, network and monitoring. Require a projected
  envelope no higher than $120 to leave headroom below $150. Include alerts and
  conservative usage limits in the operating procedure; do not call an alert or
  application ledger a hard cap on every possible Azure invoice charge.

No other production files are required by this plan. There are no production
file deletions; dependency removal is through the existing manifests/locks.
The existing high-level brief and converter comparison remain design evidence,
not a mandate to build migration, background jobs, or additional integrations.

## Additional Resources

* [Targeted assistance model research](./assistance_model_research.md): current
  candidate selection and lifecycle/cost evidence; not a completed model evaluation.

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
