# Layout-Aware Patterns: Consolidated Review

**Date:** 2026-11-24
**Target:** [Approved design](./layout_aware_patterns.md), lines 1-1606.
**Ranges:** Feature specification 1-1013; Detailed Implementation 1014-1606.
**Mode:** All five review stages, consolidated report without checkpoint pauses.
**Result:** **Not implementation-ready under the supplied readiness standard.**
**Consolidated findings:** **0 Blocker, 12 Major, 7 Nit.**
**Raw findings:** 20 Major and 8 Nit, merged into 19 action items below.

All nine requested reviewer runs completed. The intermediate Zoom Out added no
new findings; it tracked open concerns and warned against remedies that expand
scope. No design or production files were changed, fixes applied, risks accepted,
or release gates passed. Approval of the design preceded this independent review;
it is not evidence that these findings have been resolved.

## Review coverage

| Stage | Fresh-context reviewer | Status | Raw result | Report |
| --- | --- | --- | --- | --- |
| 5: Initial Zoom Out | Zoom Out | completed | 3 Major, 1 Nit | [Initial Zoom Out](./zoom_out_report.md) |
| 6: Comprehension | Comprehension | completed | 3 Major | [Complete paraphrase and findings](./comprehension_report.md) |
| 7: Critic | Design critic | completed | 3 Major | [Critic](./critic_report.md) |
| 7: Critic | Structural | completed | No findings | [Critic](./critic_report.md) |
| 7: Critic | Style | completed | 1 Major, 4 Nit | [Critic](./critic_report.md) |
| 8: Intermediate Zoom Out | Zoom Out | completed | No new findings; prior issues still open | [Intermediate Zoom Out](./intermediate_zoom_out_report.md) |
| 9: Implementation readiness | Implementation readiness | completed | 5 Major, 1 Nit | [Implementation readiness](./implementation_readiness_report.md) |
| 9: Implementation readiness | Codebase details | completed | 5 Major | [Implementation readiness](./implementation_readiness_report.md) |
| 9: Implementation readiness | Style | completed | 2 Nit | [Implementation readiness](./implementation_readiness_report.md) |

Reviewers read their personas, assigned standards, the target, linked baseline
documents, and relevant existing implementation. The structural reviewer found
no substantiated Markdown or required-section defects. The comprehension reviewer
could paraphrase the proposal and existing system; its findings concern missing
connections, not unexplained general software terms. Style-only readiness does
not override the technical reviewers' unresolved contracts.

The requested 1607 end bound in earlier stages included the empty position after
the final newline. The document has 1606 numbered content lines; no substantive
content was outside review scope.

## Evidence limits

This was a document/code-baseline review, not an execution or deployment test.
No builds, tests, converter runs, resource operations, installations, deployments,
paid model calls, or sample transmissions were performed. Private comparison
artifacts, the purchased PDF, actual Builder configuration, current provider
capabilities, and billing were not independently verified. Existing evaluation
results were treated as reported evidence rather than reproduced measurements.

Licensing, Azure availability/API/identity compatibility, guidance accuracy,
combined-container latency/resources, cost envelope, and actual Builder behavior
remain release gates. Their acknowledged incompleteness was not itself counted
as a finding. Proposed new files were not flagged merely because they do not
exist. This was one audit per stage/reviewer, not a remediation loop or a claim
of two-round convergence.

## Prioritized Major actions

### M01: Define undo across generated size baselines

**Severity:** Major. **Sources:** Z5-1, C6-1, D7-01, I9-001, B9-02.
**Scope:** [Undo policy](./layout_aware_patterns.md#selected-undo-scope-latest-instruction-change-only),
lines 567-582, 724-752, 1046-1060, 1213-1219, 1285-1307.

An extraction correction can precede first-size preparation or permitted default
regeneration. Generated baselines are excluded from user-edit undo, leaving the
old correction eligible. Its exact section inverse can restore all-size or
previous-size text into the new focused revision, or fail content validation.
A fresh root revision does not make that historical inverse compatible.

**Required resolution:** Define eligibility across generation boundaries and the
visible outcome of undo. If this narrows the approved promise, obtain an owner
decision. Do not silently add semantic rebasing, model-generated reversals, or
selective undo. Coordinate with M05. Test correction, size generation, and undo,
asserting size/content/metadata consistency.

### M02: Provide a complete editing base without exposing blocked guidance

**Severity:** Major. **Sources:** Z5-2, C6-3, I9-002.
**Scope:** lines 619-635, 1282-1297, 1348-1368, 1404-1419.

Edits require complete replacement sections, but `guidanceMarkdown` removes known
blocked passages. No separate current editable-section representation is defined.
The original source cannot recover working adaptations. Editing a section with
two unresolved passages and an adaptation can therefore save a placeholder or
erase valid work while resolving only one issue.

**Required resolution:** Distinguish complete revision-pinned editorial reference
from usable guidance in the existing read contract. Keep both bound to the same
section/revision; prohibit persisting issue placeholders as instructions. Test
resolution of one issue while preserving another and an existing adaptation.
Do not introduce a second authoritative transcription or separate editing service.

### M03: Define what the monthly model ceiling measures

**Severity:** Major. **Source:** Z5-3.
**Scope:** lines 419-424, 1144-1165, 1177-1186.

A local timeout and a two-minute month-end blackout do not prove remote inference
has stopped or establish Azure's charge attribution. The next ledger could admit
a fresh allowance while prior-month requests remain uncertain liabilities. If
the ceiling instead measures commitments admitted within a UTC month, that must
be stated; the blackout does not establish a provider-billing guarantee.

**Required resolution:** Choose admission-month commitments versus provider-
attributed consumption. For the latter, verify attribution and specify conservative
unsettled-liability carryover. Reuse reservation IDs and conditional writes, not a
new billing platform. Test rollover with an unresolved remote request and retain
the blackout only if justified by the chosen contract.

### M04: Specify the separate-project size-change journey

**Severity:** Major. **Sources:** C6-2, B9-04.
**Scope:** lines 672-678, 746-752, 780-797, 1299-1308,
1344-1349, 1412-1417, 1436-1437.

Replacing the default after starting or saving adaptations requires a new
project. The operation does not define whether it creates that project, rejects
with a page handoff, or requests a fresh source. Existing voice behavior cannot
upload or acquire a URL, and new creation routes take supplied sources rather
than existing private evidence. These choices affect ownership and retry/cleanup.

**Required resolution:** Specify an explicit new-project continuation with
independent evidence ownership and retry semantics, or a typed rejection and
source-based creation handoff. State who supplies the source and how explicit
selection occurs. Keep the original unchanged. Do not infer cloning, shared-source
reference counting, progress transfer, or a general importer.

### M05: Reserve history capacity for promised undo

**Severity:** Major. **Source:** D7-02.
**Scope:** lines 92-96, 547-582, 1050-1060.

The history limit rejects further writes, but undo appends an inverse and may
create a checkpoint. An accepted edit can consume the capacity needed to reverse
it. Repeated undo can similarly stop before earlier eligible changes are reached.

**Required resolution:** Include supported inverse/checkpoint capacity in edit
admission, coordinated with M01, or obtain approval for a narrower guarantee.
Test near-limit edits and the complete supported reversal sequence. Do not add
automatic pruning, compaction infrastructure, or another database as an implicit fix.

### M06: Establish the converter's credential and network boundary

**Severity:** Major. **Source:** D7-03.
**Scope:** lines 101-106, 503-516, 1070-1119, 1451-1470.
**Baseline:** App-scoped identity in `assistant/infra/service.bicep`; Blob role
in `assistant/infra/main.bicep:39-42,90-97`.

The converter is separate, non-root, killable, and private, but the design does
not establish access restrictions on the app's managed-identity endpoint or
arbitrary outbound destinations. Parser compromise could therefore have authority
beyond conversion. Resource limits/private ingress do not prove credential
isolation. No particular parser exploit was demonstrated.

**Required resolution:** Verify actual platform-supported identity and network
isolation, then specify it or explicitly disclose residual risk. Omitting identity
configuration from the converter is not proof of isolation. If the approved
sidecar boundary cannot meet the required protection, return that demonstrated
constraint to the owner rather than automatically introduce another service.

### M07: Make initial review and conditional follow-ups consistent

**Severity:** Major. **Source:** T7-001.
**Scope:** lines 265-280 versus 828-829.

The flow diagram's assistance only when needed can mean converter-detected
problems only. The selected policy instead uses initial bounded text/structure
review to discover problems, followed by conditional targeted investigation.

**Required resolution:** Reconcile the diagram with that policy, preserving
disabled-assistance, deadline, budget, and incomplete-coverage behavior. This
requires no extra model stage or whole-document retranscription.

### M08: Define override anchoring through section replacement

**Severity:** Major. **Source:** I9-003.
**Scope:** lines 1034-1042, 1213-1218, 1285-1297.

Overrides identify textual targets but lack uniqueness, overlap, and reanchoring
rules. Repeated stitch phrases can refer to distinct sleeves; replacement can
move or rephrase the intended occurrence. Keeping or dropping an old target
without defined validation can apply the wrong size or lose an override.

**Required resolution:** Define unambiguous anchoring, conflict rules, and what
happens when a target changes or disappears. Specify required replacement
metadata versus rejection. Test repeated, shifted, overlapping, and removed
targets without silently inferring knitting intent.

### M09: Make late-write cleanup fencing executable

**Severity:** Major. **Source:** I9-004.
**Scope:** lines 1262-1280, 1309-1333, 1373-1380.

The plan requires fencing and quiescence but does not define shared transitions
that establish no old writer can still create an artifact. A write can stall
after checking the open root, then succeed after another revision closes and
enumerates the source prefix. Rejected publication alone does not remove that
retained content. Per-object conditional operations are not a cross-object fence.

**Required resolution:** Specify durable writer registration, close ordering,
uncertain in-flight outcomes, and the condition for claiming successful cleanup.
Cover journal edits and preparation. Test an upload that succeeds after
cancellation/deadline and initial enumeration; never report complete cleanup
while that outcome remains uncertain.

### M10: Preserve every adaptation during first-default preparation

**Severity:** Major. **Sources:** I9-005, B9-03.
**Scope:** lines 1213-1223, 1285-1287, 1299-1307.

First-default initialization is allowed after starting. Generation explicitly
preserves corrections and scoped size overrides, but does not define how ordinary
adaptations made while the default was unset survive. An accepted pocket omission
or other construction change can be lost when regenerating from all-size evidence.
Restrictions on replacing an established default do not protect this first choice.

**Required resolution:** Define authoritative generation inputs and preservation/
conflict behavior for all adaptations, including explicit atomic failure when
safe preservation is unavailable. Test a started project with an unset default
and non-size adaptations, asserting no silent loss.

### M11: Preserve the HTML evidence required downstream

**Severity:** Major. **Source:** B9-01.
**Scope:** lines 1131-1139, 1199-1208, 1224-1227.
**Baseline:** `assistant/src/sources.ts:372-407,495-500`.

The existing extractor returns body text and a hostname label but discards link
destinations and the HTML title. Preparation cannot preserve a linked technique's
destination or use a title-only naming fallback after those facts are lost.

**Required resolution:** Specify checked HTML evidence including title,
relative-link resolution, destinations, and unsafe-link handling. Preserve
existing fetch safeguards and prohibit following links automatically. Test a
synthetic page containing a title and relative technique link; do not refetch to
recover data that should have been retained from the first checked response.

### M12: Partition the work into stable implementation phases

**Severity:** Major from B9-05; I9-006 independently classifies the same gap Nit.
Both source classifications are preserved rather than rewritten.
**Scope:** lines 1016-1020, 1022-1523, 1525-1532.

The numbered file inventory plus final verification does not identify stable,
buildable, testable phases required by the readiness standard. Replacing
extraction changes evidence and asynchronous dependencies consumed by current
routes/tests; file order alone does not establish integration checkpoints.

**Required resolution:** Group existing items into dependency-ordered phases,
each with a complete file set, stable behavior/interfaces, and focused offline
checks. Keep coordinated deployment and real release measurements separate.
No additional architecture is needed.

## Nit actions

| ID | Raw source | Target lines | Action |
| --- | --- | --- | --- |
| N01 | Z5-4 | 1473-1480 | Document the existing manual Builder HTTP-tool setup, including nested parameters. Treat schema import as an alternative only after verification. |
| N02 | T7-002 | 302-321, 973-977 | Use past tense for completed comparison/selection and distinguish remaining downstream evaluation. |
| N03 | T7-003 | 633-635, 810-811 | Replace resolved-contract still-to-specify wording with references to implementation items 1, 10, and 12. |
| N04 | T7-004 | 659-670 | Consolidate adjacent explicit-size/no-inference safeguards without deleting persistence or all-size-preservation requirements. |
| N05 | T7-005 | 851-853 | Replace argumentative wording with the factual limits of removing flat-extractor guards. |
| N06 | T9-01 | 1224-1227 | Replace subjective title acceptance with an observable ambiguity/fallback rule; leave extraction mechanics to implementation. |
| N07 | T9-02 | 1043-1045 | State up to 100,000 instruction characters, not a required quantity; preserve rejection and no truncation. |

## Traceability matrix

Every raw finding maps to one action; Stage 8 adds no raw IDs. Repeated findings
are not counted as separate actions or independent confirmations after reviewers
have read earlier reports.

| Action | Raw finding IDs | Origin reports |
| --- | --- | --- |
| M01 | Z5-1, C6-1, D7-01, I9-001, B9-02 | Stages 5, 6, 7, 9 |
| M02 | Z5-2, C6-3, I9-002 | Stages 5, 6, 9 |
| M03 | Z5-3 | Stage 5 |
| M04 | C6-2, B9-04 | Stages 6, 9 |
| M05 | D7-02 | Stage 7 |
| M06 | D7-03 | Stage 7 |
| M07 | T7-001 | Stage 7 |
| M08 | I9-003 | Stage 9 |
| M09 | I9-004 | Stage 9 |
| M10 | I9-005, B9-03 | Stage 9 |
| M11 | B9-01 | Stage 9 |
| M12 | I9-006, B9-05 | Stage 9; mixed original severities as noted above |
| N01 | Z5-4 | Stage 5 |
| N02 | T7-002 | Stage 7 |
| N03 | T7-003 | Stage 7 |
| N04 | T7-004 | Stage 7 |
| N05 | T7-005 | Stage 7 |
| N06 | T9-01 | Stage 9 |
| N07 | T9-02 | Stage 9 |

## Resolution boundary

All 19 actions remain open. No finding has been contested, accepted as a risk,
or repaired in this report-only run. Resolve connected contracts together:
generation/undo/history capacity (M01/M05/M10), editing/override targets
(M02/M08), and lifecycle/authority (M06/M09). Budget semantics and the required
new-project journey need explicit choices if the clarification changes approved
behavior. Mechanical diagram, HTML evidence, phasing, and editorial corrections
should not be used to expand infrastructure or import scope.

The existing licensing and real-world release gates remain in force after any
document repairs. An additional review should assess repaired contracts rather
than claim this unchanged-document run establishes convergence.
