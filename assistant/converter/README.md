# Offline PDF converter

This is a thin, content-agnostic wrapper around PyMuPDF4LLM's heuristic Markdown
conversion and PyMuPDF's native text/link extraction and full-page rendering. It
does not implement its own column detector, pattern vocabulary, size parser,
OCR, or layout model. Pattern-specific strings occur only in synthetic
regression fixtures. Short extractable text is accepted without a minimum
character count.

The worker is not connected to production uploads. Use synthetic local PDFs only
until managed sandbox isolation is verified. Offline model flags are not a
network security boundary.

## Local checks

From the repository root, using `uv` and Python 3.12:

```sh
uv venv --python 3.12 assistant/converter/.venv
uv pip install --python assistant/converter/.venv/bin/python \
  --default-index https://packagefeedproxy.microsoft.io/pypi/simple/ \
  --require-hashes --only-binary=:all: -r assistant/converter/requirements.lock
PYTHONDONTWRITEBYTECODE=1 assistant/converter/.venv/bin/python -B \
  -m unittest discover -s assistant/converter -p converter_test.py
```

The tests call the conversion function with temporary fixture paths. The actual
entry point accepts no arguments: it reads `/work/input/source.pdf` and creates
`/work/output`. Fixed paths, dependency versions, and resource caps are
execution contracts, not document-content assumptions. The entry point requires
Linux and spawns a supervised, resource-limited child; calling the function
directly does not exercise that isolation. Timeout termination gets a bounded
reap attempt; `termination_uncertain` must not be interpreted as confirmed
cleanup.

The image build context is this directory, targeting Linux amd64. Its allowlist
excludes tests, virtual environments, caches, and user PDFs. The Python base is
digest-pinned, and installation uses the Microsoft package proxy. Docker was not
running during this checkpoint, so the image, Linux memory limits, and XS
sandbox performance have not been validated. Do not publish or deploy the image
until the licensing and isolation gates below are resolved.

## Evidence contract

`manifest.json` binds results to the input's SHA-256 and length. Each ordered
page has Markdown, contiguous raw-line IDs and bounding boxes in rendered-page
point coordinates, inert link metadata, and a full-page RGB PNG including
annotations and vector overlays. Rotation is temporarily normalized for library
extraction, then restored before collecting visual evidence. No link is fetched.

The worker targets 150 DPI, reduces scale uniformly to satisfy pixel bounds, and
rejects pages needing less than 96 DPI. That floor is a conservative guard, not
demonstrated legibility. Illustration-only pages in an otherwise readable
document retain their image and `visual-only` status; a wholly image-only
document is rejected. Extractable text alone does not establish that a page is
not scanned instructions or that Markdown covers every source line. Coverage,
interpretation, and legibility still require the later preparation/review gates.

The TypeScript boundary in `../src/converter.ts` checks allowed relative paths,
versions, source binding, counts, geometry, byte limits, hashes, and page
schemas before returning a complete result. It reads artifacts serially through
an injected reader, which must enforce limits while streaming. PNG checking is
structural (signature, RGB header, dimensions, bounded chunks, image data and
terminal IEND), not decoding or CRC verification. No storage publication or
Azure SDK transport is implemented here.

## Dependencies and unresolved licensing

`requirements.lock` was resolved for Python 3.12/Linux x86_64 using
`uv pip
compile --generate-hashes` against the Microsoft proxy.
Mirror-advertised MD5 alternatives were removed; only SHA-256 hashes are
accepted. Regeneration must preserve that restriction. The heuristic path
disables layout inference but the upstream packages still declare
layout/model-related dependencies.

These are installed distribution metadata declarations, **not legal clearance**:

| Distribution   | Version  | Declared license                                   |
| -------------- | -------- | -------------------------------------------------- |
| pymupdf        | 2.1      | AGPL-3.0 or Artifex Commercial                     |
| pymupdf4llm    | 2.1      | Not declared in inspected metadata; unresolved     |
| pymupdf-layout | 2.1      | Not declared in inspected metadata; unresolved     |
| flatbuffers    | 25.12.19 | Apache-2.0                                         |
| networkx       | 3.7      | BSD-3-Clause                                       |
| numpy          | 2.5.5    | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 |
| onnxruntime    | 1.32.0   | MIT                                                |
| packaging      | 26.3     | Apache-2.0 OR BSD-2-Clause                         |
| protobuf       | 7.36.2   | BSD-3-Clause                                       |
| psutil         | 7.2.2    | BSD-3-Clause                                       |
| pyyaml         | 6.0.3    | MIT                                                |
| tabulate       | 0.10.0   | MIT                                                |

Review direct and transitive licenses, bundled native code and model assets, and
any required commercial license before image distribution or deployment.
Verified deny-egress sandbox configuration, identity isolation, cleanup and
snapshot reconciliation, actual Linux resource limits, accuracy, and cost are
also outstanding release gates in the approved design.
