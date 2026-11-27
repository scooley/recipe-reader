import { sha256 } from "./documents.ts";
import { HttpError } from "./errors.ts";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_PAGE_BYTES = 8 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 128 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_CHARACTERS = 100_000;

export interface ConverterArtifact {
  path: string;
  size: number;
  sha256: string;
}

export interface ConverterPage {
  page: number;
  widthPoints: number;
  heightPoints: number;
  extraction: ConverterArtifact;
  image: ConverterArtifact & { width: number; height: number; dpi: number };
}

export interface ConverterManifest {
  schema: 1;
  mode: "pymupdf-heuristic";
  versions: { pymupdf: "2.1"; pymupdf4llm: "2.1" };
  source: { size: number; sha256: string };
  textCharacters: number;
  rawCharacters: number;
  artifactBytes: number;
  pages: ConverterPage[];
}

export interface PageEvidence {
  page: number;
  markdown: string;
  lines: { id: string; text: string; bbox: number[] }[];
  links: {
    label: string;
    destination: string | null;
    page: number | null;
    issue: "unsafe_link" | "unsupported_link" | null;
  }[];
  textStatus: "extracted" | "visual-only";
}

export interface ConvertedPdf {
  manifest: ConverterManifest;
  pages: { evidence: PageEvidence; image: Uint8Array }[];
}

// The sandbox transport must enforce maximumBytes while streaming, not after buffering.
export type ConverterFileReader = (
  path: string,
  maximumBytes: number,
  signal: AbortSignal,
) => Promise<Uint8Array>;

function invalid(): never {
  throw new HttpError(
    502,
    "invalid_conversion",
    "Converter output failed evidence validation",
  );
}

function object(value: unknown, fields: string[]): Record<string, unknown> {
  if (
    !value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).some((key) => !fields.includes(key))
  ) invalid();
  return value as Record<string, unknown>;
}

function number(
  value: unknown,
  minimum: number,
  maximum: number,
  integer = true,
): number {
  if (
    typeof value !== "number" || !Number.isFinite(value) ||
    (integer && !Number.isSafeInteger(value)) || value < minimum ||
    value > maximum
  ) invalid();
  return value;
}

function text(value: unknown, maximum: number, minimum = 0): string {
  if (
    typeof value !== "string" || value.length < minimum ||
    value.length > maximum
  ) invalid();
  return value;
}

function hash(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) invalid();
  return value;
}

function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) invalid();
  return value;
}

function json(bytes: Uint8Array, maximum: number): unknown {
  if (!bytes.length || bytes.length > maximum) invalid();
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    invalid();
  }
}

function artifact(
  value: unknown,
  path: string,
  image = false,
): ConverterArtifact {
  const item = object(
    value,
    image
      ? ["path", "size", "sha256", "width", "height", "dpi"]
      : ["path", "size", "sha256"],
  );
  if (item.path !== path) invalid();
  return {
    path,
    size: number(item.size, 1, MAX_PAGE_BYTES),
    sha256: hash(item.sha256),
  };
}

export function parseConverterManifest(
  bytes: Uint8Array,
  source: Uint8Array,
): ConverterManifest {
  if (
    source.length < 8 || source.length > MAX_SOURCE_BYTES ||
    new TextDecoder().decode(source.subarray(0, 5)) !== "%PDF-"
  ) {
    throw new HttpError(
      415,
      "invalid_pdf",
      "Expected PDF bytes no larger than 25 MiB",
    );
  }
  const root = object(json(bytes, MAX_MANIFEST_BYTES), [
    "schema",
    "mode",
    "versions",
    "source",
    "textCharacters",
    "rawCharacters",
    "artifactBytes",
    "pages",
  ]);
  if (root.schema !== 1 || root.mode !== "pymupdf-heuristic") invalid();
  const versions = object(root.versions, ["pymupdf", "pymupdf4llm"]);
  if (versions.pymupdf !== "2.1" || versions.pymupdf4llm !== "2.1") invalid();
  const original = object(root.source, ["size", "sha256"]);
  if (
    original.size !== source.length || hash(original.sha256) !== sha256(source)
  ) invalid();
  const pages = array(root.pages, 60).map((value, index): ConverterPage => {
    const item = object(value, [
      "page",
      "widthPoints",
      "heightPoints",
      "extraction",
      "image",
    ]);
    if (item.page !== index + 1) invalid();
    const widthPoints = number(item.widthPoints, 1, 1_000_000, false);
    const heightPoints = number(item.heightPoints, 1, 1_000_000, false);
    const image = object(item.image, [
      "path",
      "size",
      "sha256",
      "width",
      "height",
      "dpi",
    ]);
    const width = number(image.width, 1, 16_384);
    const height = number(image.height, 1, 16_384);
    const dpi = number(image.dpi, 96, 150, false);
    if (
      width * height > 4_000_000 ||
      Math.abs(width - Math.ceil(widthPoints * dpi / 72)) > 1 ||
      Math.abs(height - Math.ceil(heightPoints * dpi / 72)) > 1
    ) invalid();
    return {
      page: index + 1,
      widthPoints,
      heightPoints,
      extraction: artifact(item.extraction, `pages/${index + 1}.json`),
      image: {
        ...artifact(image, `pages/${index + 1}.png`, true),
        width,
        height,
        dpi,
      },
    };
  });
  if (
    !pages.length ||
    pages.reduce(
        (total, page) => total + page.image.width * page.image.height,
        0,
      ) > 120_000_000
  ) invalid();
  const artifactBytes = number(
    root.artifactBytes,
    1,
    MAX_ARTIFACT_BYTES - bytes.length,
  );
  if (
    pages.reduce(
      (total, page) => total + page.extraction.size + page.image.size,
      0,
    ) !== artifactBytes
  ) invalid();
  return {
    schema: 1,
    mode: "pymupdf-heuristic",
    versions: { pymupdf: "2.1", pymupdf4llm: "2.1" },
    source: { size: source.length, sha256: sha256(source) },
    textCharacters: number(root.textCharacters, 1, MAX_CHARACTERS),
    rawCharacters: number(root.rawCharacters, 1, MAX_CHARACTERS),
    artifactBytes,
    pages,
  };
}

function safeLink(value: string): boolean {
  if (
    !/^https?:\/\/[^/]/i.test(value) || /[\s\\]/u.test(value) ||
    [...value].some((char) => char.charCodeAt(0) < 32)
  ) return false;
  try {
    const url = new URL(value);
    return !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function parsePage(
  bytes: Uint8Array,
  page: number,
  count: number,
): PageEvidence {
  const root = object(json(bytes, MAX_PAGE_BYTES), [
    "page",
    "markdown",
    "lines",
    "links",
    "textStatus",
  ]);
  if (root.page !== page) invalid();
  const lines = array(root.lines, MAX_CHARACTERS).map((value, index) => {
    const line = object(value, ["id", "text", "bbox"]);
    if (line.id !== `p${page}-l${index + 1}`) invalid();
    const bbox = array(line.bbox, 4).map((value) =>
      number(value, -1_000_000, 1_000_000, false)
    );
    if (bbox.length !== 4 || bbox[0] > bbox[2] || bbox[1] > bbox[3]) invalid();
    return {
      id: `p${page}-l${index + 1}`,
      text: text(line.text, MAX_CHARACTERS, 1),
      bbox,
    };
  });
  const links = array(root.links, 1000).map(
    (value): PageEvidence["links"][number] => {
      const link = object(value, ["label", "destination", "page", "issue"]);
      const label = text(link.label, MAX_CHARACTERS);
      const destination = link.destination === null
        ? null
        : text(link.destination, 2048, 1);
      const targetPage = link.page === null
        ? null
        : number(link.page, 1, count);
      if (
        link.issue !== null && link.issue !== "unsafe_link" &&
        link.issue !== "unsupported_link"
      ) invalid();
      if (
        link.issue === null
          ? (destination === null) === (targetPage === null)
          : destination !== null || targetPage !== null
      ) invalid();
      if (destination !== null && !safeLink(destination)) invalid();
      return { label, destination, page: targetPage, issue: link.issue };
    },
  );
  if (
    links.reduce((total, link) => total + link.label.length, 0) > MAX_CHARACTERS
  ) invalid();
  const textStatus = lines.length ? "extracted" : "visual-only";
  if (root.textStatus !== textStatus) invalid();
  return {
    page,
    markdown: text(root.markdown, MAX_CHARACTERS),
    lines,
    links,
    textStatus,
  };
}

function verifyBytes(bytes: Uint8Array, artifact: ConverterArtifact): void {
  if (bytes.length !== artifact.size || sha256(bytes) !== artifact.sha256) {
    invalid();
  }
}

function verifyPng(bytes: Uint8Array, image: ConverterPage["image"]): void {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 45 ||
    signature.some((value, index) => bytes[index] !== value)
  ) invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452 ||
    view.getUint32(16) !== image.width || view.getUint32(20) !== image.height ||
    bytes[24] !== 8 || bytes[25] !== 2 || bytes[26] !== 0 || bytes[27] !== 0 ||
    bytes[28] !== 0
  ) invalid();
  let offset = 33;
  let data = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = view.getUint32(offset + 4);
    if (offset + length + 12 > bytes.length) invalid();
    if (type === 0x49484452) invalid();
    if (type === 0x49444154) data = true;
    if (type === 0x49454e44) {
      if (length !== 0 || offset + 12 !== bytes.length || !data) invalid();
      return;
    }
    offset += length + 12;
  }
  invalid();
}

export async function readConvertedPdf(
  source: Uint8Array,
  read: ConverterFileReader,
  signal: AbortSignal,
): Promise<ConvertedPdf> {
  signal.throwIfAborted();
  const manifest = parseConverterManifest(
    await read("manifest.json", MAX_MANIFEST_BYTES, signal),
    source,
  );
  const pages: ConvertedPdf["pages"] = [];
  let textCharacters = 0;
  let rawCharacters = 0;
  for (const page of manifest.pages) {
    signal.throwIfAborted();
    const extraction = await read(
      page.extraction.path,
      page.extraction.size,
      signal,
    );
    signal.throwIfAborted();
    verifyBytes(extraction, page.extraction);
    const evidence = parsePage(extraction, page.page, manifest.pages.length);
    textCharacters += evidence.markdown.length;
    rawCharacters += evidence.lines.reduce(
      (total, line) => total + line.text.length,
      0,
    );
    if (Math.max(textCharacters, rawCharacters) > MAX_CHARACTERS) invalid();
    const image = await read(page.image.path, page.image.size, signal);
    signal.throwIfAborted();
    verifyBytes(image, page.image);
    verifyPng(image, page.image);
    pages.push({ evidence, image });
  }
  if (
    textCharacters !== manifest.textCharacters ||
    rawCharacters !== manifest.rawCharacters
  ) invalid();
  return { manifest, pages };
}
