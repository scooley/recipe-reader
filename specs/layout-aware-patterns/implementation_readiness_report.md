# Stage 9: Implementation Readiness Review

**Target:** [Approved design](./layout_aware_patterns.md), DetailedRange 1014-1606.
FeatureRange 1-1013 was read to resolve apparent omissions.
**Conclusion:** Not implementation-ready under the supplied readiness standard.
**Mode:** One audit per reviewer, no remediation or claim of convergence.
**Raw findings:** 10 Major, 3 Nit; no Blockers. Overlaps are retained here and
deduplicated in the [consolidated report](./consolidated_review_report.md).

## Reviewer status and evidence

| Reviewer | Status | Raw findings | Standard and conclusion |
| --- | --- | --- | --- |
| Implementation readiness | completed | 5 Major, 1 Nit | Implementation Readiness Standard; not ready |
| Codebase details | completed | 5 Major | Implementation Readiness Standard; not ready |
| Style | completed | 2 Nit | Persona only; ready from style perspective, not a release verdict |

All read their requested persona, complete target, and linked brief, comparison,
and model research. Readiness/codebase reviewers also read the requested standard
and relevant current source, API, Builder, browser, container/configuration,
infrastructure, and service-test infrastructure. Style inspected the relevant
attachment/source-read, server, storage, and Builder baseline.

Existing modification summaries (`projects.ts:398-435`) do not edit instructions.
Original text reads (`projects.ts:542-560`, `server.ts:258-262`) are not editable
working-section reads. Storage conditions (`storage.ts:11-20,86-130`) operate on
individual objects, not cross-object transactions. Existing completion cleans the
source prefix after closing (`projects.ts:570-605`). Shared MemoryStore, transport
injection, and failure-injection infrastructure were inspected for reuse.

No builds, tests, installation, deployment, external verification, resource
actions, model calls, sample transmission, history retrieval, edits, or nested
agents occurred. Proposed files were treated as future work, not missing current
dependencies. Licensing, model/package/Azure compatibility, accuracy, latency,
costs, private evidence, and real Builder behavior remain unverified release
checks, not findings simply because they are unrun.

## Implementation readiness findings

### I9-001: Undo across generated size revisions is undefined

**Severity:** Major. **Scope:** 1046-1060, 1213-1218, 1288-1307.

Exact recorded inverses, generated baselines excluded from user edits, and
corrections carried through generation do not define what undo means afterward.
For example, correcting `80/90` to `80/92`, then focusing to `92`, leaves an
earlier inverse containing `80/90`, not a compatible inverse of focused content.
Rejecting it also contradicts latest-unreversed eligibility unless that changes.

**Action:** Specify eligibility and deterministic reversal across generation,
including size/metadata consistency; test correction, size preparation, undo.

### I9-002: Section replacement lacks an edit-safe read contract

**Severity:** Major. **Scope:** 1285-1297, 1348-1368, 1404-1419.

The caller must supply complete replacement sections, but reads replace blocked
passages with placeholders. A section with two unresolved passages and an
adaptation cannot be faithfully edited to resolve one passage using guidance
alone. Rebuilding from the original can erase adaptations.

**Action:** Define complete revision-bound working-section material separately
from usable guidance, preserving unresolved text during edits. Test resolving one
issue while retaining another and an existing adaptation.

### I9-003: Override targets have no survival rules after replacement

**Severity:** Major. **Scope:** 1034-1042, 1213-1218, 1285-1297.

Textual override targets lack uniqueness, overlap, and reanchoring rules. If
“work 40 stitches” occurs for both sleeves, an override of the second occurrence
can move to the wrong passage when a later replacement reorders or rephrases it.
Issue-offset invalidation does not establish override behavior.

**Action:** Define unambiguous anchoring, conflict rules, and validation when an
anchor changes or disappears. Require explicit replacement metadata or reject
the edit as appropriate. Test repeated, shifted, and removed targets.

### I9-004: Distributed cleanup fencing is not an executable protocol

**Severity:** Major. **Scope:** 1262-1280, 1309-1333, 1373-1380.

Pre-write checks, local cancellation, expiry, and request deadlines do not prove
an old writer cannot create artifacts. An upload can stall after its open-root
check, then succeed after another revision closes and enumerates the source
prefix. Preventing publication does not remove that retained content.

**Action:** Specify durable writer registration, close/fence ordering, uncertain
in-flight write handling, and the precise condition for completion/deletion to
claim cleanup. Include journal edits, not just preparation. Test an upload that
succeeds after cancellation/deadline and initial enumeration.

### I9-005: First-default initialization can lose ordinary adaptations

**Severity:** Major. **Scope:** 1213-1223, 1299-1307.

Initialization is permitted even after starting. Generation explicitly preserves
corrections and scoped overrides but does not define preservation of other
adaptations already made with the default unset, such as a construction change.

**Action:** Define authoritative generation inputs and preservation/conflict
behavior for all adaptations. State when initialization fails atomically without
changing the prior copy. Test a started, unset-default project with a non-size
adaptation.

### I9-006: Stable phases and checkpoints are unspecified

**Severity:** Nit. **Scope:** 1016-1020, items 1-24, 1525-1532.

The file inventory and final checks do not define incremental phases that leave
stable, buildable, testable states as required by the standard.

**Action:** Group existing tasks into ordered phases with stable interfaces and
offline checkpoints; no new architecture is needed.

## Codebase details findings

### B9-01: HTML preparation needs evidence the extractor discards

**Severity:** Major. **Scope:** 1131-1139, 1199-1208, 1224-1227.
**Baseline:** `assistant/src/sources.ts:372-407,495-500`.

HTML becomes `body.textContent`; returned data contains a hostname label, URL,
and text, not link destinations or the document title. An instruction linking
“this bind-off” to a relative technique URL loses its destination. A pattern
title only in the HTML title is unavailable for naming. Preparation cannot
preserve data already discarded without another fetch or guessing.

**Action:** Specify checked HTML evidence including title and destinations,
relative-link resolution, and unsafe-link handling. Preserve fetching safeguards
and never follow those links automatically. Add a synthetic HTML regression.

### B9-02: Undo is undefined across generated size revisions

**Severity:** Major. **Scope:** 1046-1060, 1213-1219, 1288-1290.

A correction made for Small remains eligible after permitted Medium generation,
but its exact inverse may restore Small text under Medium metadata or fail hash
validation. No existing history implementation supplies missing semantics.

**Action:** Define eligibility and deterministic reversal across baselines,
including older correction entries; test size/content consistency.

### B9-03: Initial size preparation can erase ordinary adaptations

**Severity:** Major. **Scope:** 1213-1223, 1285-1287, 1299-1307.

An intentional pocket omission saved before selecting a default is not necessarily
a correction or scoped size override. The specified generation inputs do not
establish that it survives. Established-default replacement restrictions do not
protect first initialization.

**Action:** Specify preservation or explicit rejection of first-size preparation
with ordinary adaptations, its authoritative inputs, and atomic outcome; test
that the pocket adaptation is never silently removed.

### B9-04: New-project size changes lack an executable contract

**Severity:** Major. **Scope:** 1299-1307, 1344-1349, 1412-1417, 1436-1437.

Current creation is notes-only, attachment belongs to the page, and Builder
forbids voice uploads/URL acquisition. The proposed creation routes accept a
fresh source rather than an existing project's evidence. A started project's
Small-to-Medium request could create, reject with a page handoff, or ask for
re-upload; those have different ownership, retry, and cleanup effects.

**Action:** Specify a defined independent-evidence new-project operation or typed
rejection and creation handoff. Keep the original unchanged and selection explicit.

### B9-05: File-level tasks lack stable implementation phases

**Severity:** Major. **Scope:** 1016-1020, 1022-1523, 1525-1532.

Replacing extraction changes asynchronous dependencies and evidence consumed by
existing `CheckedSource` routes/tests. Implementing files in numbered order does
not identify a buildable integration checkpoint. The standard requires stable,
testable phases rather than only a coordinated final rollout.

**Action:** Group work into dependency-ordered phases with complete file sets,
stable behavior, and required offline verification. Separate deployment and real
release checks from implementation checkpoints.

## Style findings

### T9-01: Title-selection criterion is subjective

**Severity:** Nit. **Scope:** 1224-1227.

“A defensible detected pattern title” does not choose between a collection title
in PDF metadata and a pattern title on the first page or define when to fall back.

**Action:** State the observable acceptance rule, such as a uniquely identified
pattern title with fallback on ambiguity; leave extraction mechanics to code.

### T9-02: Character-limit wording sounds like a required quantity

**Severity:** Nit. **Scope:** 1043-1045.

“Preserve 100,000 instruction characters” does not directly state an upper bound.
Later wording resolves the intent, but a shorter document should clearly comply.

**Action:** Say “Accept documents containing up to 100,000 instruction characters,”
retaining explicit rejection and no truncation.
