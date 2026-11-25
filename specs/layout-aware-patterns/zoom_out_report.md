# Stage 5: Initial Zoom Out Review

**Target:** [Approved design](./layout_aware_patterns.md), lines 1-1607.
**Reviewer:** `egm:zoom_out` (fresh context).
**Status:** completed. **Result:** 3 Major, 1 Nit; no Blockers.
**Design changes:** none. Findings are not yet resolved or accepted risks.

## Evidence and limits

The reviewer read its bundled persona and `zoom-out-standard.md`, repository
instructions, the three linked design evidence documents, the matching draft,
`assistant/README.md`, and the relevant source, API, Builder, web, container,
configuration, infrastructure, dependency, and test files. Proposed new modules
were distinguished from existing implementations. Conditional Blob writes,
project revisions, modification records, authentication, bounded webpage
transport, hashing, validation, and injectable test transports are reusable.

There is no root README/context file; the assistant README supplies the baseline.
Private comparison scripts/outputs were not independently inspected. Azure
capabilities, prices, real Builder behavior, purchased-pattern fidelity, and
performance were not independently verified. These remain unrun release checks,
not passed checks. No resource actions, builds, tests, installations, model calls,
or production/design edits were performed.

The root problem and proposed response are coherent. The findings concern
interactions between selected mechanisms, not replacing approved constraints
merely because simpler alternatives exist. DetailedRange appropriately contains
implementation detail.

## Findings

### Z5-1: Generated size revisions invalidate exact historical undo

**Severity:** Major. **Scope:** design lines 1046-1060, 1213-1218, 1285-1307.

Undo applies the exact inverse of the latest unreversed user instruction change,
but generated preparation baselines are excluded from user edits. A correction
made before selecting the first size can be carried into a generated focused
section. Undoing that correction afterward would restore historical all-size
text/metadata over the focused representation. Rejecting that inverse also leaves
the promised undo behavior undefined. A current root revision does not make the
historical inverse compatible with the new representation.

**Action:** Define an explicit undo boundary at generated preparation and what
working reads report as undoable afterward. Obtain an owner decision if this
narrows the undo promise; do not silently add semantic rebasing. Test correction,
first-size generation, then undo.

### Z5-2: Guidance filtering removes the base required for section edits

**Severity:** Major. **Scope:** lines 619-634, 1282-1297, 1353-1368.

Complete-section replacements must preserve unchanged working text, yet blocked
passages are withheld from `guidanceMarkdown`. There is no separate contract for
reading the complete current editable section. Original-source text does not
include working adaptations. An editor can therefore copy placeholders, lose
adaptations, or regenerate from the wrong base while correcting a blocked passage
or changing another part of its section.

**Action:** Distinguish guidance-safe content from revision-pinned editorial
evidence in the existing working-read API. Supply the complete current section
as explicitly non-guidance reference data; require replacements to use it. Test
a section containing both a blocked passage and a saved adaptation.

### Z5-3: Month-end blackout does not define the budget accounting boundary

**Severity:** Major. **Scope:** lines 419-424, 1144-1165, 1177-1186.

Reservations are partitioned by UTC month. Refusing calls in its last two minutes
does not establish that remote inference has stopped after a backend timeout or
which month Azure attributes the charge to. The next ledger could admit a fresh
allowance while unresolved prior-month calls remain liabilities. If the intended
ceiling instead measures commitments admitted during a month, the claimed
cross-month guarantee and blackout are unnecessary.

**Action:** Define admission-month commitments versus provider-attributed
consumption. For the latter, verify attribution and conservatively carry unsettled
liabilities into subsequent admission calculations. Reuse ledger/CAS machinery.
Test month rollover with an unresolved remote request; retain the blackout only
if it has a demonstrated purpose.

### Z5-4: Builder rollout assumes unsupported schema import

**Severity:** Nit. **Scope:** lines 1473-1480.

The plan requires importing tool schemas, but the established README describes
manual HTTP-tool entries and explicitly does not promise an import capability.

**Action:** Specify updates to the existing manual tool entries, including nested
parameters. Allow import only after verifying it in the actual Builder interface;
retain timeout and parameter-expressiveness release checks.

## Scope discipline

Outstanding licensing, Azure capability, accuracy, latency, and cost measurements
are explicitly release gates, not standalone findings merely because they are
unfinished. The future normalized import boundary is not treated as an implemented
Ravelry integration.
