import { deepStrictEqual } from "node:assert/strict";
import {
  type ConverterManifest,
  type PageEvidence,
  parseConverterManifest,
  readConvertedPdf,
} from "../src/converter.ts";
import { sha256 } from "../src/documents.ts";
import { HttpError } from "../src/errors.ts";

const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const source = new TextEncoder().encode("%PDF-1.7 synthetic input");
const png = Uint8Array.fromBase64(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAC0lEQVR4nGNgQAYAAA4AAamRc7EAAAAASUVORK5CYII=",
);

function fixture() {
  const markdown =
    "Eight sizes: 1 2 3 4 5 6 7 8. Work 10 cm, then consult the diagram.";
  const page: PageEvidence = {
    page: 1,
    markdown,
    lines: [{ id: "p1-l1", text: markdown, bbox: [0, 0, 1.5, 1.5] }],
    links: [{
      label: "Glossary",
      destination: "https://example.org/glossary",
      page: null,
      issue: null,
    }],
    textStatus: "extracted",
  };
  const extraction = encode(page);
  const manifest: ConverterManifest = {
    schema: 1,
    mode: "pymupdf-heuristic",
    versions: { pymupdf: "2.1", pymupdf4llm: "2.1" },
    source: { size: source.length, sha256: sha256(source) },
    textCharacters: markdown.length,
    rawCharacters: markdown.length,
    artifactBytes: extraction.length + png.length,
    pages: [{
      page: 1,
      widthPoints: 1.5,
      heightPoints: 1.5,
      extraction: {
        path: "pages/1.json",
        size: extraction.length,
        sha256: sha256(extraction),
      },
      image: {
        path: "pages/1.png",
        size: png.length,
        sha256: sha256(png),
        width: 2,
        height: 2,
        dpi: 96,
      },
    }],
  };
  const files = new Map<string, Uint8Array>([["pages/1.json", extraction], [
    "pages/1.png",
    png.slice(),
  ]]);
  const calls: string[] = [];
  const read = (
    path: string,
    maximumBytes: number,
    signal: AbortSignal,
  ): Promise<Uint8Array> => {
    signal.throwIfAborted();
    calls.push(path);
    const bytes = path === "manifest.json" ? encode(manifest) : files.get(path);
    if (!bytes || bytes.length > maximumBytes) {
      throw new Error("Unbounded or unknown read");
    }
    return Promise.resolve(bytes);
  };
  const setPage = (value: unknown): void => {
    const bytes = encode(value);
    files.set("pages/1.json", bytes);
    manifest.pages[0].extraction = {
      path: "pages/1.json",
      size: bytes.length,
      sha256: sha256(bytes),
    };
    manifest.artifactBytes = bytes.length + manifest.pages[0].image.size;
  };
  return { page, manifest, files, calls, read, setPage };
}

async function fails(
  action: () => unknown,
  conversionError = true,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (
      conversionError &&
      (!(error instanceof HttpError) || error.code !== "invalid_conversion")
    ) throw error;
    if (
      !conversionError &&
      (!(error instanceof DOMException) || error.name !== "AbortError")
    ) throw error;
    return;
  }
  throw new Error("Invalid converter result was accepted");
}

Deno.test("converter artifacts are validated serially and inert source links are never fetched", async () => {
  const input = fixture();
  const result = await readConvertedPdf(
    source,
    input.read,
    new AbortController().signal,
  );
  deepStrictEqual(result.pages[0].evidence, input.page);
  deepStrictEqual(result.pages[0].image, png);
  deepStrictEqual(input.calls, [
    "manifest.json",
    "pages/1.json",
    "pages/1.png",
  ]);
});

Deno.test("generic short text is accepted without pattern vocabulary or an arbitrary minimum length", async () => {
  const input = fixture();
  input.page.markdown = "Mix.";
  input.page.lines[0].text = "Mix.";
  input.setPage(input.page);
  input.manifest.rawCharacters = 4;
  input.manifest.textCharacters = 4;
  const result = await readConvertedPdf(
    source,
    input.read,
    new AbortController().signal,
  );
  deepStrictEqual(result.pages[0].evidence.markdown, "Mix.");
});

Deno.test("invalid UTF-8 extraction is rejected even when its size and digest match", async () => {
  const input = fixture();
  const bytes = new Uint8Array([0xff, 0xfe]);
  input.files.set("pages/1.json", bytes);
  input.manifest.pages[0].extraction.size = bytes.length;
  input.manifest.pages[0].extraction.sha256 = sha256(bytes);
  input.manifest.artifactBytes = bytes.length + png.length;
  await fails(() =>
    readConvertedPdf(source, input.read, new AbortController().signal)
  );
});

Deno.test("manifest rejects unsafe paths, wrong ownership hashes, versions and missing or repeated pages before artifact reads", async () => {
  const changes = [
    (value: ConverterManifest) =>
      value.pages[0].extraction.path = "../source.pdf",
    (value: ConverterManifest) => value.pages[0].image.path = "/work/other.png",
    (value: ConverterManifest) =>
      value.pages[0].image.path = "https://example.org/image.png",
    (value: ConverterManifest) => value.source.sha256 = "a".repeat(64),
    (value: ConverterManifest) => value.source.size++,
    (value: ConverterManifest) => value.pages.push(value.pages[0]),
    (value: ConverterManifest) => value.pages[0].page = 2,
    (value: ConverterManifest) => value.pages.splice(0),
    (value: ConverterManifest) => value.artifactBytes++,
    (value: ConverterManifest) => value.pages[0].image.size = 9 * 1024 * 1024,
  ];
  for (const change of changes) {
    const input = fixture();
    change(input.manifest);
    await fails(() =>
      readConvertedPdf(source, input.read, new AbortController().signal)
    );
    deepStrictEqual(input.calls, ["manifest.json"]);
  }
  const input = fixture();
  await fails(() =>
    parseConverterManifest(
      encode({
        ...input.manifest,
        versions: { pymupdf: "other", pymupdf4llm: "2.1" },
      }),
      source,
    )
  );
});

Deno.test("pixel geometry and total evidence limits cannot be bypassed with a small encoded file", async () => {
  for (
    const change of [
      (value: ConverterManifest) => value.pages[0].image.width = 4,
      (value: ConverterManifest) => value.pages[0].image.dpi = 95,
      (value: ConverterManifest) => value.pages[0].image.width = 16_385,
      (value: ConverterManifest) => value.pages[0].widthPoints = 1_000_001,
    ]
  ) {
    const input = fixture();
    change(input.manifest);
    await fails(() => parseConverterManifest(encode(input.manifest), source));
  }
  const input = fixture();
  const original = input.manifest.pages[0];
  input.manifest.pages = Array.from({ length: 31 }, (_, index) => ({
    ...original,
    page: index + 1,
    widthPoints: 1500,
    heightPoints: 1500,
    extraction: { ...original.extraction, path: `pages/${index + 1}.json` },
    image: {
      ...original.image,
      width: 2000,
      height: 2000,
      path: `pages/${index + 1}.png`,
    },
  }));
  input.manifest.artifactBytes *= 31;
  await fails(() => parseConverterManifest(encode(input.manifest), source));
});

Deno.test("hashes and byte lengths reject corrupt artifacts, while aggregate counts reject incomplete evidence", async () => {
  for (const path of ["pages/1.json", "pages/1.png"]) {
    const input = fixture();
    const bytes = input.files.get(path)!.slice();
    bytes[bytes.length - 1] ^= 1;
    input.files.set(path, bytes);
    await fails(() =>
      readConvertedPdf(source, input.read, new AbortController().signal)
    );
  }
  const input = fixture();
  input.manifest.textCharacters++;
  await fails(() =>
    readConvertedPdf(source, input.read, new AbortController().signal)
  );
});

Deno.test("page evidence rejects ambiguous anchors and unsafe links even with valid artifact hashes", async () => {
  for (
    const change of [
      (page: PageEvidence) => page.lines[0].id = "p2-l1",
      (page: PageEvidence) => page.lines.push(page.lines[0]),
      (page: PageEvidence) => page.lines[0].bbox = [2, 0, 1, 0],
      (page: PageEvidence) => page.page = 2,
      (page: PageEvidence) => page.textStatus = "visual-only",
      (page: PageEvidence) => page.links[0].destination = "javascript:alert(1)",
      (page: PageEvidence) =>
        page.links[0].destination = "https://synthetic:synthetic@example.org/",
      (page: PageEvidence) => page.links[0].page = 1,
    ]
  ) {
    const input = fixture();
    change(input.page);
    input.setPage(input.page);
    await fails(() =>
      readConvertedPdf(source, input.read, new AbortController().signal)
    );
  }
  const input = fixture();
  input.page.links = [{
    label: "Unusable destination",
    destination: null,
    page: null,
    issue: "unsafe_link",
  }];
  input.setPage(input.page);
  const result = await readConvertedPdf(
    source,
    input.read,
    new AbortController().signal,
  );
  deepStrictEqual(result.pages[0].evidence.links, input.page.links);
});

Deno.test("PNG dimensions and chunk boundaries are checked independently of supplied hashes", async () => {
  for (
    const bytes of [
      png.slice(0, -1),
      png.map((value, index) => index === 19 ? 3 : value),
      png.map((value, index) => index === 0 ? 0 : value),
    ]
  ) {
    const input = fixture();
    input.files.set("pages/1.png", bytes);
    input.manifest.pages[0].image.size = bytes.length;
    input.manifest.pages[0].image.sha256 = sha256(bytes);
    input.manifest.artifactBytes = input.manifest.pages[0].extraction.size +
      bytes.length;
    await fails(() =>
      readConvertedPdf(source, input.read, new AbortController().signal)
    );
  }
});

Deno.test("cancellation between artifact reads stops subsequent file requests", async () => {
  const input = fixture();
  const controller = new AbortController();
  await fails(() =>
    readConvertedPdf(source, async (path, limit, signal) => {
      const bytes = await input.read(path, limit, signal);
      if (path === "pages/1.json") controller.abort();
      return bytes;
    }, controller.signal), false);
  deepStrictEqual(input.calls, ["manifest.json", "pages/1.json"]);
});
