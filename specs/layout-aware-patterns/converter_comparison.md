# Local PDF Converter Comparison

* **Date:** 2026-11-24
* **Status:** Sample evaluation complete; owner selected heuristic PyMuPDF
* **Related design:** [Layout-aware working instructions](./design_draft.md)

## Scope and method

Converted the user's four-page `liya_top.pdf` locally, without generative model
assistance. Compared the Markdown and exported visuals against original-page
renders, with particular attention to pages 2-4. The source PDF was not changed
or added to the repository. No hosted document or LLM API was invoked by the
evaluation code. Package and Docling model downloads were needed for setup.

Source SHA-256:
`4ccdc0662b8c48f6c6180b5d2044f60310254da7bca53e43fe3a4f9b728ad454`.

Ran CPU conversion on an ARM64 Mac with 24 GiB RAM and Python 3.12.16. Requested
two threads through environment settings and Docling's CPU accelerator options;
this is not a two-vCPU Azure benchmark. Ran candidates sequentially to avoid
direct contention. Model-based layout is different from generative language
model assistance. Docling's optional picture-description and chart-understanding
features were disabled, but its standard document models were used for layout
and tables.

| Configuration | Versions and settings |
| --- | --- |
| Docling | `docling==2.150.1`, `docling-core==2.107.1`, `docling-ibm-models==4.0.4`; standard PDF pipeline, CPU, OCR off, table structure on; remote services and external plugins disabled; picture description, chart extraction, code and formula enrichment off. Page/picture rendering at 150 DPI equivalent. |
| PyMuPDF default layout | `pymupdf==2.1`, `pymupdf4llm==2.1`, `pymupdf-layout==2.1`; default layout enabled, OCR off, page chunks and image export on, 150 DPI. |
| PyMuPDF heuristic layout | Same package versions, using the supported `pymupdf4llm.use_layout(False)` configuration; page chunks and image export on, 150 DPI. Uses the non-layout-model extraction path, without OCR. |

The third configuration was added after the default PyMuPDF layout interleaved
columns. It materially changes the result; judging PyMuPDF solely by the default
would miss a viable lower-memory extraction path. This was bounded configuration
testing, not an exhaustive converter tuning exercise.

## Output findings

| Requirement | Docling | PyMuPDF default layout | PyMuPDF heuristic layout |
| --- | --- | --- | --- |
| Page-2 instruction order | Preserves Back, Front/left shoulder, then right shoulder; left-shoulder continuation follows in the right column. | Interleaves columns. A row from the left-shoulder continuation appears inside Back; right-shoulder heading appears before Front. | Preserves the main column and shoulder order. |
| Page-3 neck-band continuation | Places the right-column continuation after Neck band. | Places that continuation near the beginning of page 3, before Body and Neck band. | Places the continuation after Neck band. |
| Section structure | Many useful Markdown headings, but Yarn and Gauge remain paragraph labels. Some stitch totals become false headings. | Several useful headings, but ordering errors undermine their meaning; some totals also become headings. | Major section labels are bold text rather than Markdown headings. More section normalization is needed. |
| Size information | Retains the ordered size list and all 24 eight-value numeric slash-sequence occurrences checked. | Same numeric preservation, despite incorrect instruction order. | Same numeric preservation. |
| Measurements | All 64 numeric values and their row order match the source. Combines the two unit tables into one Markdown table, inserting the imperial heading as a repeated cell row; the first measurement row becomes the Markdown header. | Same numeric preservation, but merges the unit tables and embeds pieces of the imperial heading inside a metric row. | Preserves both unit headings and all rows as plain text, not Markdown tables. |
| Glossary links | Retains all 3 distinct original destinations. | Extracts underlined labels but loses all 3 destinations from the Markdown. | Retains all 3 destinations; one wrapped label becomes two links to the same destination. |
| Annotated measurement image | Exported composite preserves arrows, ellipses, and a-d labels on visual inspection. | Exported composite also preserves those overlays. | Includes a full composite, but also exports an extra cropped duplicate missing the top context. |
| Page furniture and attribution | Repeats designer attribution on page 1; retains a footer inside the left-shoulder continuation. | Retains page numbers and copyright footers in the instruction stream. | Retains page furniture and extra line breaks in the instruction stream. |

The eight-value sequence checks are content-preservation checks, not proof of
correct association or completeness. All configurations passed those checks,
including the configuration with incorrect instruction order. Measurement
values were also compared row-by-row against the original PDF's positioned text;
that does not fix a converter's damaged unit structure.

All configurations returned repeatable Markdown across two conversions after
normalizing local image paths. Docling and default PyMuPDF were also rerun in a
fresh process with downloaded weights cached; their text remained unchanged
after image-path normalization. Repeatability is not correctness.

## Local performance

The first two rows below use a fresh process with dependencies and model weights
already available. The heuristic path needs no additional layout-model download.
First-output time includes measured imports/setup plus conversion and Markdown/
JSON export. Warm conversion is a second conversion with the same converter
process. Peak RSS is the process high-water mark across both runs and exports;
PyMuPDF runs also rendered reference pages afterward. These are small-sample
measurements, not percentiles or container resource guarantees.

| Configuration | First output, cached setup | Warm conversion and export | Peak process RSS |
| --- | --- | --- | --- |
| Docling | 8.71 s | 3.02 s | 2293 MiB |
| PyMuPDF default layout | 0.75 s | 0.42 s | 457 MiB |
| PyMuPDF heuristic layout | 0.39 s | 0.31 s | 117 MiB |

Docling's initial process, including first-use model setup/downloads, took about
28.0 seconds to its first output and peaked at 2618 MiB over the two runs.
Dependency installation time is excluded. Production should not depend on
downloading model weights during an upload; image construction and caching must
be evaluated once the converter is selected.

Both viable extraction paths were within the approximate one-minute target on
this machine. This does not establish Azure upload, replica cold-start,
sidecar-startup, model-assistance, persistence, or preview latency. Docling's
measured process alone exceeded the current entire Container App's 1 GiB memory
allocation. Its selected sidecar deployment therefore needs separate resource
measurements and cost sizing; current settings cannot be assumed adequate.

## Cost, licensing, and remaining work

* No Azure inference or other paid conversion service was used in this test.
  Local timings cannot establish a monthly Azure bill or prove the $0.10
  assistance allowance is sufficient.
* Installed Docling, Docling Core, and Docling IBM Models packages declare MIT.
  Individual downloaded model licenses and the final dependency set still need
  deployment review; package licensing alone is not model-license clearance.
* Installed PyMuPDF declares dual AGPL-3.0/Artifex commercial licensing. Review
  the applicable obligations or commercial terms before choosing it for the
  service. No commercial price was obtained, and Azure-credit coverage for any
  license must not be assumed.
* Docling offers more structure here, with a larger runtime/memory footprint and
  remaining heading, attribution, and unit-table cleanup.
* Heuristic PyMuPDF preserves the main instruction flow with much lower measured
  memory, but needs section/table normalization, duplicate-image handling, and a
  resolved licensing path. Its behavior must be pinned explicitly rather than
  rely on the current default layout mode.
* Default PyMuPDF layout, as tested, does not meet the representative reading-order
  requirement. This finding applies to the tested version/configuration and
  document, not every PyMuPDF mode or PDF.
* Neither raw output is ready to publish unchanged as the final working
  instructions. Keep faithful full-page evidence whichever converter is chosen.
  More sample patterns are needed before claiming support for the entire layout
  class. No selected Azure model or production deployment was evaluated.

## Inspect the actual outputs

Full transformations, diagrams, diagnostics, dependency versions, and scratch
scripts are private local session artifacts, not tracked repository files. A
fresh clone cannot reproduce their links without obtaining the sample and
rerunning the evaluation. The report intentionally does not embed the pattern's
instructions or images.

* [Docling Markdown](/Users/scooley/.copilot/session-state/75d09f7a-8760-4054-9bff-8a3c78bbf440/files/pdf-comparison/docling/run-1/instructions.md)
* [PyMuPDF default-layout Markdown](/Users/scooley/.copilot/session-state/75d09f7a-8760-4054-9bff-8a3c78bbf440/files/pdf-comparison/pymupdf/run-1/instructions.md)
* [PyMuPDF heuristic-layout Markdown](/Users/scooley/.copilot/session-state/75d09f7a-8760-4054-9bff-8a3c78bbf440/files/pdf-comparison/pymupdf-legacy/run-1/instructions.md)
* [Private evaluation directory](/Users/scooley/.copilot/session-state/75d09f7a-8760-4054-9bff-8a3c78bbf440/files/pdf-comparison/)

The evaluation directory contains `compare.py`, `audit.py`, `audit.json`,
`requirements-resolved.txt`, original-page renders, and per-configuration
`metrics.json` files. Dependencies came through the Microsoft package feed proxy
specified by the owner after direct PyPI artifact downloads failed. One initial
heuristic-run export failed because the scratch harness did not serialize
rectangle objects; that harness bug was fixed and both successful runs repeated.
It was not a converter fidelity failure.

## Owner decision

After reviewing the output and the model-reader versus human-reader trade-off,
the owner selected explicitly configured heuristic PyMuPDF. The selection keeps
licensing resolution and downstream accuracy checks as release gates. Docling's
richer structure did not demonstrate better downstream answers in this
evaluation, because no downstream question-answering comparison was run.

This is a baseline selection, not approval of unmodified converter output,
Azure resource sizing, a commercial license purchase, or production readiness.
No hybrid of both converters has been selected. The
[design](./design_draft.md) records the chosen mode and remaining gates.
