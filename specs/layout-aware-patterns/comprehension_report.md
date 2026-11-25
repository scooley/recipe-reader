## What this proposes

The service would turn PDFs and supported public webpages into named, editable working instructions, preserving a separate all-size interpretation and source evidence. PDF conversion would use a private heuristic PyMuPDF sidecar, with bounded Azure model assistance and a shared $25 monthly model budget. Preview and voice tools would expose uncertainty, support project defaults and scoped size overrides, and record revision-safe instruction changes with latest-change undo. Completion would retain personal project records while deleting source-derived documents and history; implementation and release verification remain outstanding.

## How the existing system works, per this document

The existing single-owner Deno service stores project records, explicit progress, modifications, and immutable source text in private Azure Blob Storage. It accepts restricted text-only PDFs and supported public HTML pages, but rejects PDF images, drawings, and obvious separated columns. LiveKit Builder currently reads the active project's complete original source; modifications are project records rather than edits to saved instructions. The authenticated management page handles source attachment and deletion, while completion removes sources and retains notes.

## Reviewer status and evidence limitations

**Stage 6 Comprehension Test: completed.** One fresh-context, read-only audit covered the entire target document: FeatureRange **1-1013** and DetailedRange **1014-1607**.

**Required reads completed:**
- The specified comprehension persona.
- All three directly linked local baselines: `concepts_brief.md`, `converter_comparison.md`, and `assistance_model_research.md`.
- Existing implementation files explicitly named by the plan: the six affected `assistant/src/` modules; OpenAPI and Builder instructions; the three named web files; Deno manifests/lock; Docker configuration; environment example; README; service infrastructure files; and `assistant/tests/service.test.ts`.
- Existing `assistant/infra/main.bicep`, referenced by the service template, for infrastructure context.

Files labeled **create** in the detailed plan were checked and are absent, consistent with proposed work—not missing existing dependencies.

**Not run:** tests, builds, conversion, deployment, resource operations, paid calls, or sample-document transmission. No agents were spawned, files modified, conversation history retrieved, or separate prior review reports consulted. The predecessor brief contains its own historical review synthesis; that was encountered as baseline content, not used as independent validation.

The purchased PDF, private comparison artifacts, deployed service, Builder configuration, and external provider documentation were not independently inspected. Licensing, model compatibility, accuracy, latency, and cost therefore remain explicitly deferred release checks, not findings merely because they are unproven.

## Findings

### C6-1 — Undo is not connected to intervening size-generated revisions

**Severity:** Major  
**Exact target scopes:** lines **567-582**, **724-752**, **1055-1060**, **1213-1219**, and **1288-1290**.

**Discrepancy and rationale:**  
The document permits extraction corrections before size selection, carries those corrections into later size-focused generation, and excludes generated preparation baselines from user-edit undo. It also requires undo to apply the exact recorded inverse without regeneration.

Consider a correction made to an all-size section, followed by successful size-focused preparation. That correction appears to remain the latest eligible user change, but its recorded section-level inverse belongs to the earlier all-size document. A reader cannot tell whether undo is now unavailable, reverses only the correction within the focused instructions, or restores the earlier section and potentially its size-related metadata. These interpretations give materially different meanings to “undo” and to the association between a selected size and its working revision.

**Suggested clarification:**  
State whether size-generated publication establishes an undo boundary. If earlier corrections remain undoable, explain conceptually how their deterministic reversal preserves the current size-focused baseline rather than restoring incompatible historical section content.

### C6-2 — The new-project rule lacks a clear user-facing continuation

**Severity:** Major  
**Exact target scopes:** lines **672-678**, **746-752**, **780-797**, **1299-1308**, and **1344-1349**.

**Discrepancy and rationale:**  
Replacing an established default after starting—or after saving adaptations—requires a separate project. The dedicated `set_project_size` operation is nevertheless described as the way to explicitly replace a default, while the detailed contract says only that replacement obeys those rules.

The document does not connect these statements into an unambiguous journey: does the size operation create a separate project using the existing project's source, or reject the request and direct the user to upload/import again? The new creation routes describe page-based source submission, not the continuation of this voice request. Explicit project selection and independent cleanup ownership are clear requirements, but neither establishes which continuation the user receives.

**Suggested clarification:**  
Add a short description of the outcome when a default replacement requires a new project: who initiates creation, whether the source must be supplied again, and how the newly created project is offered for explicit selection. This needs a workflow explanation, not a complete additional API design.

### C6-3 — Complete-section editing is not clearly connected to withheld guidance

**Severity:** Major  
**Exact target scopes:** lines **619-630**, **1282-1297**, and **1353-1366**.

**Discrepancy and rationale:**  
Edits require complete replacement Markdown for each affected section, including preservation of unchanged wording. Working reads withhold known blocking passages from `guidanceMarkdown`, returning placeholders and ambiguity information instead.

The document does not say whether those reads also provide the complete current section as explicitly non-guidance editing material. If placeholders are the only working text available, the agent cannot preserve an unresolved passage while editing another part of that section—or faithfully correct it against the current adapted wording. Reading the immutable original would not recover intervening adaptations. Alternatively, if complete editable text is returned separately, the distinction between that material and usable guidance needs to be stated.

**Suggested clarification:**  
Explain how the agent obtains revision-matched, complete section content for replacement while blocked passages remain unavailable as guidance. Explicitly distinguish editable reference content from speakable guidance, and prohibit saving issue placeholders as replacement instructions.

**Summary:** **0 Blockers, 3 Majors, 0 Nits.** The overall proposal is paraphrasable; the findings concern connections between otherwise explained behaviors, not missing general terminology or deferred release measurements.
