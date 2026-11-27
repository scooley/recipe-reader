# Goldfish Annotated Review Report

**Target:** [Layout-aware patterns design](./layout_aware_patterns.md), full file.
**Input:** The 12 Major actions in the [consolidated review](./consolidated_review_report.md).
**Status:** Proposed repairs; owner directions recorded, canonical design not yet revised.
**Scope:** Major findings only. Original reviewer reports remain unchanged.

## Owner decisions

* Keep original instructions as reference and store additive instructions rather
  than replacing whole sections. Replace version undo with deactivation of
  explicitly identified changes. If a change/reset scope is unclear, discuss it
  with the user rather than assume whether corrections or customizations apply.
  Notes and actual progress are not reversed.
* Save the default size without rewriting instructions. Normal guidance uses the
  original, selected default, and active additions, including explicit scoped size
  choices. Remove generated size-focused copies.
* Account for model requests in the UTC month they started. Keep unknown costs
  reserved in that original month, not carried into the next allowance. This is
  an application admission budget, not an Azure billing-month guarantee.
* When the existing default-size policy requires another project, create it from
  an independently owned copy of the source. Keep the original unchanged and
  selection explicit; do not silently transfer progress or adaptations.
* Replace the converter sidecar with managed Azure Container Apps Sandboxes and
  deny outbound access. Platform/API, identity, transfer, lifecycle/deletion,
  latency, licensing, and cost checks remain release gates. No deployment,
  spending, or sample transmission is authorized.

## Prioritized Findings and Proposed Repairs

Original severities and raw-finding mappings remain in the consolidated report.
All findings below were valid against the reviewed design; a changed product
direction supersedes some mechanisms but does not make the original critique
inaccurate. No issue is marked fixed before revised text and dependent contracts
are checked.

### M01: Undo across generated size baselines — Severity: Major

* **Affected scope:** Undo policy, generated size preparation, document history,
  modification API, preview, Builder, tests; original lines 567-582, 724-752,
  1046-1060, 1213-1219, 1285-1307.
* **Discrepancy:** Exact historical section inverses are incompatible with later
  generated size baselines.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** The owner replaced version undo and generated focused copies
  with original-reference instructions and independent additive changes.
* **Proposed edit:** Remove whole-section replacements, inverse journal replay,
  periodic instruction checkpoints, generated size baselines, and latest-change
  undo. Define attributable additions and explicit activation/deactivation with
  revision checks. Returning to original identifies which scoped changes to set
  aside; ambiguous scope triggers conversation. Preserve source evidence,
  inactive change history until completion, notes, and reported progress.

### M02: Editing base versus withheld guidance — Severity: Major

* **Affected scope:** Read and modification schemas, clarification policy,
  Builder, tests; original lines 619-635, 1282-1297, 1348-1368, 1404-1419.
* **Discrepancy:** Complete replacement cannot preserve withheld current text.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** Additive writes no longer need to reconstruct an entire
  editable section. Original evidence must still be available for clarification.
* **Proposed edit:** Return revision-pinned original sections and active additions
  with issue attribution. Clearly distinguish source/reference material from
  guidance that is safe to use. Known unresolved passages remain blocked until
  clarified; unrelated guidance remains available. Do not save placeholders or
  generate another authoritative merged document. Test an addition/clarification
  without altering another unresolved passage or existing customization.

### M03: Monthly accounting boundary — Severity: Major

* **Affected scope:** Budget policy, ledger/client contracts, tests, operating
  documentation; original lines 419-424, 1144-1165, 1177-1186.
* **Discrepancy:** A month-end blackout does not establish provider attribution.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** The owner chose the month in which a request starts.
* **Proposed edit:** Attribute each reservation and settlement to its admission
  month using a server timestamp; maintain original-month reservations for unknown
  outcomes and idempotent retries. Remove the blackout and cross-month guarantee.
  Keep shared pre-call reservations and explicit exhaustion. Test rollover and
  delayed settlement without consuming a second month's allowance for the same
  request. Disclose that Azure can attribute charges differently.

### M04: New-project size-change journey — Severity: Major

* **Affected scope:** Project creation, default-size API, retry recovery,
  storage ownership, selection, Builder, preview, tests; original lines 672-678,
  746-752, 780-797, 1299-1308, 1344-1349, 1412-1417, 1436-1437.
* **Discrepancy:** The required separate project has no defined continuation.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** The owner selected independent source copying rather than
  a mandatory management-page re-upload.
* **Proposed edit:** Make the size operation return either an allowed in-place
  default update or the separately created project's identity, with the original
  unchanged. Copy existing evidence into the new project's own cleanup boundary;
  do not refetch URLs or automatically reinterpret the PDF, transfer progress/
  adaptations, or change the active project. Define explicit source-copy retry
  identity, atomic publication, failure cleanup, and selection handoff. Clarify
  any ambiguous requested transfer rather than infer its scope.

### M05: Capacity for promised reversal — Severity: Major

* **Affected scope:** History capacity, change admission/deactivation, tests;
  original lines 92-96, 547-582, 1050-1060.
* **Discrepancy:** Undo could require storage unavailable after an accepted edit.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** Inverse section history is removed, but a full system must
  still permit deactivation of existing additions and cleanup.
* **Proposed edit:** Bound additive instruction storage and preserve capacity for
  status/deactivation operations. Remove the inverse-journal/checkpoint guarantee
  instead of retaining it solely to address a superseded finding. Test a new
  addition rejected at capacity while an existing change can still be deactivated.

### M06: Converter authority boundary — Severity: Major

* **Affected scope:** Architecture, converter transport/runtime, configuration,
  deployment templates, readiness, lifecycle, cost and privacy documentation,
  tests; original lines 101-106, 503-516, 1070-1119, 1451-1470.
* **Discrepancy:** A same-app sidecar is not demonstrated identity isolation.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** The owner selected managed sandboxes after reviewing
  [isolation research](./converter_isolation_research.md).
* **Proposed edit:** Replace the always-running converter sidecar and local HTTP
  service with a request-bound sandbox transport and fixed converter command.
  Configure deny-default outbound policy before passing input; keep application
  credentials and general storage/model permissions outside the sandbox. Scope
  Deno's sandbox-management authorization to the required group. Use a prebuilt
  source-free image; transfer bounded input/output through the data plane. Define
  cancellation, deletion, source-containing snapshot handling, lost-response
  recovery, availability, and cost gates. Do not equate stopping with deleting.

### M07: Initial review versus conditional assistance — Severity: Major

* **Affected scope:** Data-flow diagram and assistance descriptions; original
  lines 265-280, 828-829.
* **Discrepancy:** Only-when-needed wording omits selected initial discovery.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** This is a wording mismatch, not a new product choice.
* **Proposed edit:** Show bounded initial text/structure review, followed by
  conditional targeted calls, within existing request and budget bounds. Preserve
  disabled-assistance/incomplete-coverage behavior. Remove size-generation calls
  because selecting a default no longer rewrites instructions.

### M08: Stable override targets — Severity: Major

* **Affected scope:** Addition/correction/override metadata, read/write
  validation, clarification, tests; original lines 1034-1042, 1213-1218, 1285-1297.
* **Discrepancy:** Mutable textual targets lack uniqueness and survival rules.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** An immutable reference removes text-replacement reanchoring,
  but additions still need unambiguous scopes and precedence.
* **Proposed edit:** Identify original sections/passages with stable evidence
  identifiers. Define section-wide versus specific-value scope, repeated-text
  disambiguation, explicit supersession/deactivation of identified additions,
  and rejection/clarification of unresolved overlapping changes. Do not silently
  infer knitting compatibility or decide ambiguous scope. Test repeated passages,
  overlapping scopes, and a later change targeting an earlier addition.

### M09: Executable cleanup fencing — Severity: Major

* **Affected scope:** Source writers, copy operations, sandbox attempts,
  project completion/deletion, recovery, storage tests; original lines 1262-1280,
  1309-1333, 1373-1380.
* **Discrepancy:** Local cancellation and root checks do not fence delayed writes.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** External sandbox resources add another lifecycle boundary;
  the owner-selected request-bound model still requires explicit recovery.
* **Proposed edit:** Define shared attempt/writer registration, close ordering,
  storage-enforced conditional publication of artifact content, and handling of
  unresolved in-flight writes. Register external resource ownership before source
  transfer; retain recovery pointers until sandbox/snapshot cleanup is confirmed.
  Allow full cleanup success only after late source-content writes are fenced
  and all required source content is removed. Otherwise report partial completion
  explicitly. Cover copy, preparation, and additive writes in delayed-success,
  crash, concurrent-close, and lost-delete-response tests.

### M10: First default must preserve adaptations — Severity: Major

* **Affected scope:** Default-size operation, guidance, metadata, Builder,
  tests; original lines 1213-1223, 1285-1287, 1299-1307.
* **Discrepancy:** Regeneration could erase non-size adaptations.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** The owner selected saving a default without regeneration.
* **Proposed edit:** Default selection changes only validated project context.
  Preserve original instructions and active additions; give scoped changes
  precedence over the default. Apply the same rule to validated imported size
  metadata without a redundant question. Test first selection on a started
  project with an existing non-size adaptation; assert no instruction rewrite or
  backend model call.

### M11: HTML evidence retention — Severity: Major

* **Affected scope:** Checked HTML extraction, source types, preparation,
  naming, tests; original lines 1131-1139, 1199-1208, 1224-1227.
* **Discrepancy:** Downstream requirements need title and links already discarded.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** Existing supported HTML input needs the evidence contract,
  not another acquisition mechanism.
* **Proposed edit:** Retain checked title, structural references, and safe link
  destinations from the existing fetch; specify relative resolution and unsafe
  link handling. Never automatically follow links, fetch HTML images, or refetch
  lost evidence. Preserve current SSRF/size/deadline safeguards and test a relative
  technique link and HTML-title naming fallback with synthetic input.

### M12: Stable implementation phases — Severity: Major

* **Affected scope:** Entire file inventory, integration order, offline checks,
  deployment/Builder rollout; original lines 1016-1020, 1022-1523, 1525-1532.
* **Discrepancy:** Numbered files do not establish buildable integration stages.
* **AI suggestion:** PROPOSE FIX.
* **Justification:** This is a sequencing repair. B9-05 classified it Major and
  I9-006 Nit; retain both source classifications in the audit trail.
* **Proposed edit:** Rebuild the file list around the simplified architecture,
  grouped into dependency-ordered phases: reference/addition contracts and
  storage; injected preparation/converter integration; safe project operations
  and API; page/Builder integration; authorized platform/release verification.
  Give each phase stable behavior, complete files, and focused checks. No phase
  depends on paid resources merely to run offline tests. Avoid implementing the
  superseded sidecar HTTP server, edit journal, checkpoints, or size generator.

## Approval boundary

These are proposed document repairs, not implemented fixes. Applying them updates
the design and dependent contracts, not production code. Preserve historical
review findings, annotate their disposition, and do not claim a fresh re-audit or
release validation. The seven standalone Nits are outside this review unless a
changed passage necessarily resolves one as part of a Major repair.
