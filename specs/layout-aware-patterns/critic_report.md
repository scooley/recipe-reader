# Stage 7: Critic Review

**Target:** [Approved design](./layout_aware_patterns.md), FeatureRange 1-1013.
DetailedRange 1014-1607 was available to resolve apparent omissions.
**Mode:** Consolidated report, one audit per reviewer, no remediation or claim
of iterative convergence. **Result:** 4 Major, 4 Nit; no Blockers.

## Reviewer status and evidence

| Reviewer | Status | Findings | Standard |
| --- | --- | --- | --- |
| Design critic | completed | 3 Major | Feature specification |
| Structural | completed | none | Feature specification |
| Style | completed | 1 Major, 4 Nit | Persona; no additional standard |

All three read their bundled personas, full target, linked concept brief,
converter comparison, and assistance-model research. The design critic inspected
relevant source, storage, server, OpenAPI, Builder, container, dependency, and
infrastructure contracts. Structural checked headings, tables, fences, and local
links. Style inspected relevant source, project, storage, Builder, and
infrastructure baseline portions.

The structural reviewer found sequential heading nesting, consistent table
columns, closed fences, and existing local-link destinations. The specification
standard does not require a fixed section order or a separately titled risks
section. Its applicable topics are covered.

Purchased/private evidence, real Azure/Builder configuration, current provider
documentation, and release measurements were not independently verified. No
tests, builds, model calls, resource actions, installations, deployments,
transmissions, or design/production edits were performed. Explicitly deferred
release checks were not counted as defects merely because they remain unrun.

## Findings

### D7-01: Undo is undefined across permitted size regeneration

**Reviewer:** Design critic. **Severity:** Major.
**Scope:** lines 567-582, 724-751; supporting detail 1046-1060,
1213-1218, 1285-1307.

Undo restores recorded section content and metadata, while default-size
preparation creates a generated baseline excluded from user-edit undo.
Regeneration is prohibited by adaptations but not extraction corrections. A
correction made while focused on Small can survive regeneration for Medium;
its inverse still contains the Small-era section. Applying it can restore
incompatible contents or fail predecessor/content validation.

**Action:** Define undo eligibility across generated baselines. Preserve a
deterministic size-consistent reversal or explicitly constrain regeneration/undo
across that boundary. Specify the user-visible outcome and test it.

### D7-02: History exhaustion can make an accepted edit irreversible

**Reviewer:** Design critic. **Severity:** Major.
**Scope:** lines 92-96, 547-582; supporting detail 1050-1060.

The 64 MiB history bound rejects subsequent writes, but undo appends an inverse
and may create a checkpoint. No reversal capacity is reserved. A successful edit
can therefore consume the allowance needed to undo it; repeated latest-only undo
may also stop before earlier changes are reached.

**Action:** Include supported reversal/checkpoint capacity in edit admission or
obtain approval for a narrower recovery guarantee before accepting those edits.

### D7-03: Converter isolation does not define an authority boundary

**Reviewer:** Design critic. **Severity:** Major.
**Scope:** lines 101-106, 503-516; supporting detail 1070-1119,
1451-1470. Existing baseline: `assistant/infra/main.bicep:39-42,90-97`
and the app-scoped identity in `assistant/infra/service.bicep`.

The converter handles untrusted PDFs in a killable child inside a separate
non-root container. The design does not establish whether it can access the
Container App's identity endpoint or arbitrary outbound destinations. Existing
identity grants Blob contributor authority; proposed grants add inference.
Termination, memory limits, and private ingress do not constrain authority after
a native-parser compromise. This is a risk, not a demonstrated parser exploit.

**Action:** Define and verify converter credential/network isolation, requiring
PDF-processing code to lack application tokens and arbitrary destinations, or
record platform limits and residual risk. If the selected sidecar cannot meet
that boundary, return the architecture decision to the owner.

### T7-001: Flow diagram obscures initial bounded model review

**Reviewer:** Style. **Severity:** Major.
**Scope:** lines 828-829 versus 265-280.

The diagram says assistance occurs only when needed, but the selected policy
uses initial bounded text/structure review to discover suspect passages, then
conditional targeted follow-ups. Reading the diagram as converter-detected
problems only changes the discovery policy. Detailed Implementation confirms
the initial step but does not make the feature summary consistent.

**Action:** Show initial review separately from conditional follow-ups, preserving
budget/deadline limits, disabled-assistance behavior, and incomplete coverage.

### T7-002: Completed comparison still reads as pending selection work

**Reviewer:** Style. **Severity:** Nit.
**Scope:** lines 302-321, 973-977.

Imperatives to compare before selecting and define checks before executing sit
beside confirmation that comparison and selection occurred. Alternatives still
lists the converter comparison among prerequisites.

**Action:** Use past tense for completed selection; distinguish any further
comparative evaluation from downstream accuracy and replica measurements.

### T7-003: Resolved contracts still read as unspecified

**Reviewer:** Style. **Severity:** Nit.
**Scope:** lines 633-635, 810-811.

The API still needs validation/checkpoint rules and title-failure behavior must
be specified, although Detailed Implementation provides these.

**Action:** Replace outstanding-work language with references to implementation
items 1, 10, and 12; preserve the requirements.

### T7-004: Adjacent paragraphs duplicate size-selection safeguards

**Reviewer:** Style. **Severity:** Nit. **Scope:** lines 659-670.

The repeated explicit-selection/no-inference rule adds no condition and
separates the all-size-preservation requirement from its context.

**Action:** Consolidate once without removing successful persistence,
size-independent guidance, or preserved original information.

### T7-005: Argumentative wording obscures a factual limitation

**Reviewer:** Style. **Severity:** Nit. **Scope:** lines 851-853.

The phrase about pretending flat extraction is sufficient attributes intent
instead of stating the actual extraction limitation.

**Action:** State that removing guards alone does not solve reading order,
size associations, or visual evidence; retain supported text-only behavior.
