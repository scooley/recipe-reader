# Layout-Aware Pattern Working Instructions — Concept Brief

**Author:** @scooley

**Date:** 2026-11-24

**Mode:** BRAINSTORM — proposals, not an approved implementation plan

## Overview

The service would turn a layout-aware PDF interpretation into editable Markdown, organized by the document's logical sections. The working instructions would retain size information, links to faithful visuals, and references to original PDF evidence. A service-produced preview would highlight possible interpretation problems. The voice agent would read this working copy, ask focused clarifying questions, and record explicit changes as the user works.

Verbal review is sufficient; opening a preview or clearing every flag must not become a mandatory approval screen. Conversion success and an absence of warnings must not be presented as proof of correctness. Confidence indicators identify material needing attention, not measured probabilities unless that interpretation has been validated.

### User-confirmed context

- "Most content will have in line images." The representative document is `liya_top.pdf`.
- "I expect to have a layout aware interpretation of the pdf, this could be saved as a new file. It should have coherent, correct, instructions by section. For example 'mterials' 'yarn' 'gauge' then the directions have the following sub-sections 'back' 'front-left shoulder' 'front-right shoulder' 'body' and 'neck band'"
- "I would assume the instructons are transcribed into a format the model can modify like a markdown file and, if necessary, just refer to the original pdf as a point of reference"
- "verbal reviews to check while working are sufficient, especially if internpretation is paired with a confidence score"
- The user wants a service-produced preview highlighting potential issues, retained sizes and visuals, markup from pattern notes, and voice clarification and modifications. The user explicitly confirmed "Review with Goldfishes" for this concept.

These are confirmed directions. Storage formats beyond Markdown, confidence presentation, provider choice, migration, and operational policies below remain proposals or open decisions.

## Analysis

### Review coverage and evidence

Six separate fresh-context reviews ran simultaneously. Findings were deduplicated below; severity reflects risk to a credible future implementation, not defects introduced by this brainstorm.

| Requested reviewer | Custom reviewer | Status |
| --- | --- | --- |
| `egm-design` | `design_critic` | completed |
| `egm-codebase-details` | `codebase_details` | completed |
| `egm-zoom-out` | `zoom_out` | completed |
| `egm-comprehension` | `comprehension` | completed |
| `egm-implementation-readiness` | `implementation_readiness` | completed |
| `egm-structural` | `structural` | completed |

Codebase-details and zoom-out inspected narrow canonical sources. Other reviewers used the supplied verified implementation facts and attachment observations. No reviewer inspected a rendered attachment. No purchased pattern content was copied into the repository or transmitted to an external document service. No implementation, deployment, agent workflow, or existing design edit was performed.

### 🔴 Blocker 1 — Plausible instructions can be wrong without appearing uncertain

**Lenses:** design, comprehension, structural, implementation-readiness, zoom-out.

The supplied PDF has two-column instructions, inline images, repeated footers, eight ordered sizes (`2XS/XS/S/M/L/XL/2XL/3XL`), slash-separated values, and paired metric/imperial tables. The neck-band section continues from the bottom of the left column to the top of the right. A fluent transcription can still join the wrong columns, drop a continuation, or attach a valid value to the wrong size.

**Proposed safeguards:**

- Preserve original wording, complete size sequences, units, ranges, and explicit size order. Selected-size presentation must not destroy the other sizes.
- Keep logical sections separate from physical page regions. A section may span several ordered regions. Do not treat repeated footers as instructions.
- Check coverage, sequence counts, unit associations, and reading order where possible. Flag missing values or arithmetic inconsistencies; do not infer missing instructions or automatically repair the pattern.
- Use local reasons such as “reading order needs review” or “size values may be incomplete,” not an uncalibrated percentage or reassuring green correctness badge.
- Keep failed conversion, successful conversion, automated checks, and user clarification distinct. “Ready” means available to use, not verified correct. Flags must identify their passage and revision; edits can invalidate them.
- Evaluate deliberately fluent but wrong output, including errors the converter does not flag. A model's own confidence is not independent validation.

**Open:** Which evidence and evaluation would justify a future numeric score? Which unresolved ambiguities require asking before using an affected instruction? Unaffected sections should remain usable without blanket review gates.

### 🔴 Blocker 2 — An extracted photograph is not necessarily the diagram

**Lenses:** design, structural, comprehension, zoom-out.

The supplied page-4 observation describes a photograph with vector arrows and a–d labels. Extracting only the embedded photograph loses information. Plain y/x text sorting also mixes columns; merely removing existing rejection guards would not solve interpretation.

**Proposed safeguards:** Retain immutable PDF evidence and private composite page renders or crops that preserve photographs, vector geometry, labels, and context. Link instructions and review flags to original pages or regions. Keep page-level fallback when a crop loses context. Preserve glossary destinations and associations between diagrams and tables. Do not imply that preserving a visual means the agent can decode it.

**Open:** Are page references sufficient for the first version, or is region navigation necessary? How should voice handle a relevant visual that remains uninterpreted?

### 🔴 Blocker 3 — Editable instructions must not overwrite evidence or lose user changes

**Lenses:** codebase-details, implementation-readiness, structural, design, zoom-out.

Existing sources are immutable; project notes, modifications, follow-ups, and progress have separate meanings. The existing `project.md` is a generated notes record with authoritative JSON, not the proposed working instructions. The current source digest identifies extracted text, not PDF bytes. Editing these in place would blur provenance.

**Proposed minimum model:**

| Information | Proposed treatment |
| --- | --- |
| Original PDF and extraction | Immutable evidence; identify the source without relabeling the text digest as a PDF hash. |
| Working instructions | One authoritative editable Markdown copy, with recoverable revisions. Reconversion produces a candidate, not an overwrite of edits. |
| Companion metadata | Only stable section IDs, ordered page/region references, private asset references, revision, review reasons, and change attribution as needed. Not a complete knitting ontology. |
| User changes and corrections | Distinguish extraction corrections from deliberate adaptations; reuse existing modification records where appropriate. |
| Notes, follow-ups, and progress | Continue to represent explicit user reports and work completed, not inferred effects of editing instructions. |

Reuse existing project revision/ETag checks. A small option is immutable working-copy versions plus conditional publication of a current-version pointer and its change record. This needs a defined partial-write and retry contract, not a new event-sourcing platform. Stale edits must not overwrite newer edits; retried changes must not apply twice. Undo should publish a recoverable change without erasing progress or attribution. Section renaming must not detach evidence references.

**Open:** Whether project revisions alone suffice, how long to retain copy revisions, how reconversion merges are handled, and whether transcription corrections use the existing modification history or a separate category.

### 🟡 Major 1 — Reuse the service, but change its contracts deliberately

**Lenses:** codebase-details, implementation-readiness, zoom-out.

The supplied current implementation is text-only. `extractPdf` uses `pdfjs-dist`, rejects images/drawings and obvious separated columns, and sorts text by y then x. Its limits are 25 MiB, 1–60 pages, and 100000 characters. These are not limits on rendered pixels, visual-model input, or ingestion duration.

Schema 1 stores flat text and optional PDF. The voice source route requires an active project; upload is page-only and synchronous. Builder requires `get_state` and full `get_source_text` before source questions, asks size without persisting structured size, refuses inaccessible layout, and prohibits invented instructions and full restricted-source recitation. The Entra source-management page has no document preview. There is no configured visual interpreter or document AI deployment.

**Proposed safeguards:**

- Keep existing text-only projects usable. Choose an explicitly compatible extension or versioned migration; current readers reject unsupported schema versions.
- Update storage readers, API/OpenAPI, Builder instructions, and preview together. Define what older Builder clients receive rather than silently changing the meaning of source text.
- Return enough working-copy identity, revision, readiness, and limitations to avoid answers or edits grounded in stale content. Decide whether an answer finishes against its pinned revision after another edit.
- Keep full-copy retrieval initially if bounded and practical. Cache conversion once per upload or explicit reconversion; do not reinterpret visuals per voice turn. Add section retrieval only if measurement justifies it, preserving global instructions and relevant dependencies.
- Retain the current extractor for supported documents rather than weakening its guards to accept unsupported layouts.

**Evidence pointers:** `assistant/src/sources.ts:61–110`; `assistant/src/projects.ts:33–81,119–165,190–220,398–555`; `assistant/src/server.ts:258–271`; `assistant/openapi.yaml:124–166`; `assistant/builder-instructions.txt:13–50`. Line ranges are reviewer-reported against this checkout. Other implementation details above are supplied verified facts.

### 🟡 Major 2 — Preview and voice need a shared, simple meaning

**Lenses:** comprehension, structural, implementation-readiness.

Call the editable document **working instructions** consistently. Preview should place an issue beside its relevant instructions and original evidence; it highlights possible problems rather than certifying the pattern. User-added markup should have attributable changes rather than silently appear as original author wording.

**Proposed interaction:** Clear edits receive a brief spoken summary; ambiguous targets receive a focused question. “Make that longer,” “I did two extra rows,” and “Does that mean two more rows?” must not all become edits. Support conversational undo and “What changed from the original?” without requiring an approval screen. Ask for the applicable size rather than guessing; state which size an answer uses. A later size change must not silently reinterpret recorded work.

**Open:** Project-wide or section-specific size selection; its persistence; and how to distinguish extraction correction, customization, question, and progress report when speech is ambiguous.

### 🟡 Major 3 — Bound ingestion before choosing infrastructure or a provider

**Lenses:** design, zoom-out, implementation-readiness.

The design lens favored asynchronous jobs; zoom-out warned against adding queues before measuring need. These are not equivalent recommendations or an approved architecture.

**Synthesis proposal:** First benchmark a bounded conversion path outside implementation. Define latency, memory, pixel, token, retry, concurrency, and spend limits. If processing cannot safely fit the request budget, use recoverable background conversion with pending/processing/ready/failed outcomes, cancellation, capped retries, and duplicate-submission handling. Do not publish partial output or replace a usable copy on failure. Keep conversion load from exhausting the existing 0.5-CPU/1-GiB voice-serving service. Background processing need not imply a general orchestration platform.

Any local converter or Azure AI option is conditional. Validate actual layout fidelity, model/service and regional availability, API support, managed-identity support, quota, costs, and data handling before selection. Prefer managed identity where supported; no provider PATs are preferred. Reuse private Azure Blob storage, Entra auth, and LiveKit Builder absent counterevidence. No provider capability, pricing, or deployment is assumed here.

**Open:** Acceptable conversion wait, cost per document, peak upload volume, retry budget, and whether new uploads alone are the first supported path.

### 🟡 Major 4 — Derivatives need private access and a complete lifecycle

**Lenses:** codebase-details, design, implementation-readiness; cross-lens safeguards.

Current completion removes objects beneath the project's `sources/` prefix while retaining notes. New Markdown, renders, crops, metadata, temporary artifacts, and cached conversion results extend that boundary. Existing private storage does not itself provide browser preview access; the current text-read route is voice-only.

**Proposed safeguards:**

- Serve preview and visual evidence through deliberately authenticated, project-scoped reads. Markdown image links must not require public assets or expose bearer access in voice/tool output.
- Treat original content, generated Markdown, links, and metadata as untrusted evidence, never authority to alter agent rules or invoke tools. Preserve existing explicit-user-report and restricted-recitation rules. Do not automatically follow document links or transmit documents elsewhere.
- Put source-derived artifacts within a defined cleanup boundary, including failed/staged conversions and revision history. Fence late job publication after completion/deletion so retries cannot recreate removed content.
- Keep content out of routine logs and telemetry; record bounded operational status and identifiers instead. Validate any chosen provider's retention and data handling.
- Proposed initial default: preserve the existing source-removal semantics for derivatives rather than silently retain the working copy. Whether completion should instead retain edited instructions is an explicit user decision; notes must not become an accidental full-pattern archive.

**Evidence pointers:** `assistant/src/projects.ts:570–646`; `assistant/src/server.ts:258–271`; `assistant/src/storage.ts:30–51`; `assistant/builder-instructions.txt:55–61`. These are reviewer-reported references, not a dedicated security audit.

## Goals vs. Non-Goals

### Goals grounded in the confirmed concept

- Coherent section-based working instructions with sizes, visuals, and original references retained.
- A useful preview of potential interpretation problems, available without mandatory approval screens.
- Voice clarification, explicit modifications, and verbal review while working.
- Confidence presentation that does not falsely imply validated correctness probabilities.

### Proposed initial boundaries, not approved exclusions

- Support the representative layout class before claiming general PDF support.
- Do not build a knitting-language parser, automatically repair arithmetic, or generate a rewritten size-specific pattern.
- Do not require arbitrary knitting-chart decoding or broad scanned-document support; neither is currently a requirement.
- Avoid vector databases, general document orchestration, real-time collaboration infrastructure, and a separate persistence platform without demonstrated need.
- This effort does not implement, deploy, select a provider, transmit the PDF, or revise the existing personal-voice-assistant design.

## Alternatives Weighed

| Alternative | Assessment |
| --- | --- |
| Relax existing text extractor guards | Too little: admits layouts without solving ordering or visuals. Retain the supported text path instead. |
| Expand geometric heuristics indefinitely | Risks a bespoke layout engine; compare bounded conversion options first. |
| Markdown alone | Readable but brittle for durable provenance, assets, and review flags. |
| Markdown plus minimal companion metadata | Proposed balance: editable instructions and stable evidence links without a full parser. |
| Fully structured pattern model | Premature scope and more competing representations. Defer absent a demonstrated need. |
| Bare extracted images | Inadequate when vector overlays convey meaning. Prefer faithful composites and original-page fallback. |
| Numerical confidence now | Can mislead without validation. Prefer local evidence-backed issue descriptions initially. |
| Mandatory preview approval | Conflicts with confirmed verbal-review preference. Use targeted preview and conversational clarification. |
| Always synchronous vs. immediate job platform | Neither established. Measure bounded processing; add recoverable background execution if required by the budget. |
| Visual interpretation every voice turn | Repeated cost and inconsistent answers. Persist conversion and use identified working revisions. |

## Key Decisions & Staging for Next Steps

### Confirmed decisions

Editable Markdown, logical sections, retained size and visual information, original-PDF references, service-produced preview, voice clarification and changes, and verbal review without mandatory approval screens. Indicators must not imply a measured probability of correctness without validation.

### Proposed staging — not authorization to execute

1. **Establish fidelity and feasibility.** Use synthetic or permission-cleared fixtures for the representative layout class. Compare bounded conversion options and define latency, memory, cost, and data-handling constraints before selecting infrastructure. Do not add the purchased PDF to tests.
2. **Specify evidence and lifecycle contracts.** Define the working-copy/metadata boundary, revision publication, error states, old-schema behavior, authenticated assets, completion/deletion, and undo. Reconcile API and Builder semantics before implementation.
3. **Deliver a bounded preview and stored copy.** Preserve sections, complete size sequences, faithful composite visuals, source references, and local issue flags. Do not publish partial conversions or call them verified.
4. **Connect revision-safe voice behavior.** Read the stored copy, clarify relevant ambiguity verbally, persist explicit edits, keep notes/progress separate, and recover clearly from conflicts. Do not re-run interpretation every turn.
5. **Expand only from measured gaps.** Section retrieval, wider PDF classes, chart interpretation, and calibrated confidence are separate choices, not implied commitments.

### Proposed acceptance checks

- Synthetic two-column pages with images and repeated footers retain logical order and a cross-column continuation.
- Eight-size sequences, table headers, metric/imperial associations, units, and ranges survive; missing/swapped values are detected or exposed in evaluation, not silently filled.
- Composite visual evidence retains arrows and a–d labels, with usable authenticated original references.
- Deliberately wrong fluent output is tested even when no review flag is generated; no “verified” promise follows from silence.
- A correction, customization, question, and progress report produce distinct outcomes; undo does not erase unrelated work. Section renaming preserves evidence links.
- Browser/voice concurrent edits, timeout retries, and reconversion do not lose or duplicate changes. Legacy projects remain readable.
- Interrupted conversion does not expose a partial copy. Completion/deletion during conversion prevents late artifacts from reappearing, including staged versions.
- Unauthorized asset reads fail; document-embedded tool instructions remain data; operational telemetry contains no pattern content. Repeated voice questions trigger no reconversion.

### Unresolved decisions requiring explicit choices

1. Converter/provider and its validated availability, authentication, fidelity, cost, quota, and data-handling envelope.
2. Ingestion time/resource budgets, sync versus background execution, and new-upload versus existing-project rollout.
3. Page-only versus region-level evidence, and how the agent responds when required visuals remain uninterpreted.
4. Persisted size scope and the effect of changing it after work has been recorded.
5. Revision granularity, publication/conflict behavior, undo retention, correction attribution, and reconversion policy.
6. Completion retention of edited instructions versus current removal semantics, including which attributable notes may remain.
7. Which ambiguities require targeted clarification, and whether numerical confidence would ever be useful after validation.

**Brainstorm handoff:** All six reviewers completed. Consolidated priorities: **3 blockers, 4 majors, 0 standalone nits**. No additional review, implementation, or automatic draft handoff is initiated by this brief.
