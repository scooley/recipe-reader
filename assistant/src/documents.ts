import { createHash } from "node:crypto";
import { HttpError, requireObject, requireText } from "./errors.ts";

export interface OriginalLine {
  id: string;
  text: string;
  page: number | null;
  kind: "instruction" | "furniture";
}

export interface OriginalSection {
  id: string;
  title: string;
  lines: OriginalLine[];
  dependsOn: string[];
}

export type OriginalTarget =
  | { kind: "project" }
  | { kind: "section"; sectionId: string }
  | {
    kind: "passage";
    sectionId: string;
    lineId: string;
    start: number;
    end: number;
    quote: string;
  };

export interface ReferenceIssue {
  id: string;
  reason: string;
  targets: OriginalTarget[];
}

export interface OriginalReference {
  schema: 1;
  kind: "pdf" | "web";
  sourceSha256: string;
  textSha256: string;
  pageCount: number;
  sections: OriginalSection[];
  sizes: { id: string; label: string }[];
  issues: ReferenceIssue[];
  coverage: { reviewedLineIds: string[]; unreviewedLineIds: string[] };
}

export interface InstructionAddition {
  id: string;
  category: "correction" | "adaptation";
  targets: OriginalTarget[];
  text: string;
  sizeId?: string;
  supersedes: string[];
  resolvesIssueIds: string[];
  modificationId: string;
  attribution: {
    actor: "owner";
    channel: "page" | "voice";
    clarification: string;
  };
  createdAt: string;
}

export interface ActiveAddition {
  record: InstructionAddition;
  active: boolean;
}

function invalid(message: string): never {
  throw new HttpError(422, "invalid_document", message);
}

function object(value: unknown, fields: string[]): Record<string, unknown> {
  const result = requireObject(value);
  if (Object.keys(result).some((key) => !fields.includes(key))) {
    invalid("Document contains an unknown field");
  }
  return result;
}

function identifier(value: unknown): string {
  if (
    typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value)
  ) {
    invalid("Invalid document identifier");
  }
  return value;
}

function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)
  ) {
    invalid("Invalid addition or modification identifier");
  }
  return value;
}

function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    invalid("Document collection exceeds its limit or is not an array");
  }
  return value;
}

function unique(values: string[]): string[] {
  if (new Set(values).size !== values.length) {
    invalid("Repeated document identifier");
  }
  return values;
}

function integer(value: unknown, minimum: number, maximum: number): number {
  if (
    typeof value !== "number" || !Number.isSafeInteger(value) ||
    value < minimum || value > maximum
  ) {
    invalid("Document number is out of bounds");
  }
  return value;
}

function hash(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    invalid("Invalid evidence hash");
  }
  return value;
}

export function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function target(value: unknown, sections: OriginalSection[]): OriginalTarget {
  const item = object(value, [
    "kind",
    "sectionId",
    "lineId",
    "start",
    "end",
    "quote",
  ]);
  if (item.kind === "project") {
    if (Object.keys(item).length !== 1) {
      invalid("Project target must not carry a passage");
    }
    return { kind: "project" };
  }
  const sectionId = identifier(item.sectionId);
  const section = sections.find((section) => section.id === sectionId);
  if (!section) invalid("Unknown original section");
  if (item.kind === "section") {
    if (Object.keys(item).length !== 2) {
      invalid("Section target must not carry a passage");
    }
    return { kind: "section", sectionId };
  }
  if (item.kind !== "passage") invalid("Unknown target kind");
  const lineId = identifier(item.lineId);
  const line = section.lines.find((line) => line.id === lineId);
  if (!line) invalid("Line does not belong to the target section");
  const start = integer(item.start, 0, line.text.length);
  const end = integer(item.end, start + 1, line.text.length);
  if (
    typeof item.quote !== "string" || line.text.slice(start, end) !== item.quote
  ) {
    invalid("Passage quote does not match the exact original occurrence");
  }
  return { kind: "passage", sectionId, lineId, start, end, quote: item.quote };
}

function targets(
  value: unknown,
  sections: OriginalSection[],
): OriginalTarget[] {
  const result = array(value, 10).map((value) => target(value, sections));
  if (!result.length) {
    invalid("At least one explicit original target is required");
  }
  unique(result.map((item) => JSON.stringify(item)));
  if (
    result.some((item, index) =>
      result.some((other, otherIndex) =>
        otherIndex < index && overlaps(item, other)
      )
    )
  ) {
    invalid("Addition targets must not repeat or overlap each other");
  }
  return result;
}

export function overlaps(a: OriginalTarget, b: OriginalTarget): boolean {
  if (a.kind === "project" || b.kind === "project") return true;
  if (a.sectionId !== b.sectionId) return false;
  if (a.kind === "section" || b.kind === "section") return true;
  return a.lineId === b.lineId && a.start < b.end && b.start < a.end;
}

export function parseReference(
  value: unknown,
  sourceBytes?: Uint8Array,
): OriginalReference {
  const root = object(value, [
    "schema",
    "kind",
    "sourceSha256",
    "textSha256",
    "pageCount",
    "sections",
    "sizes",
    "issues",
    "coverage",
  ]);
  if (root.schema !== 1 || (root.kind !== "pdf" && root.kind !== "web")) {
    invalid("Unsupported reference schema or source kind");
  }
  const pageCount = integer(
    root.pageCount,
    root.kind === "pdf" ? 1 : 0,
    root.kind === "pdf" ? 60 : 0,
  );
  const sections = array(root.sections, 200).map((value): OriginalSection => {
    const section = object(value, ["id", "title", "lines", "dependsOn"]);
    return {
      id: identifier(section.id),
      title: requireText(section.title, "section title", 200),
      dependsOn: unique(array(section.dependsOn, 200).map(identifier)),
      lines: array(section.lines, 100_000).map((value): OriginalLine => {
        const line = object(value, ["id", "text", "page", "kind"]);
        if (
          typeof line.text !== "string" || !line.text.length ||
          line.text.length > 100_000
        ) invalid("Invalid original line text");
        if (line.kind !== "instruction" && line.kind !== "furniture") {
          invalid("Invalid original line kind");
        }
        if (root.kind === "web" && line.page !== null) {
          invalid("HTML lines do not have PDF page numbers");
        }
        return {
          id: identifier(line.id),
          text: line.text,
          kind: line.kind,
          page: root.kind === "pdf" ? integer(line.page, 1, pageCount) : null,
        };
      }),
    };
  });
  if (!sections.length || sections.some((section) => !section.lines.length)) {
    invalid("Original sections must contain evidence");
  }
  const sectionIds = unique(sections.map((section) => section.id));
  const lines = sections.flatMap((section) => section.lines);
  const lineIds = unique(lines.map((line) => line.id));
  const text = lines.map((line) => line.text).join("\n");
  if (
    text.length > 100_000 || !lines.some((line) => line.kind === "instruction")
  ) invalid("Original instruction text is empty or too large");
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (section: OriginalSection): void => {
    if (visiting.has(section.id)) invalid("Cyclic section dependencies");
    if (visited.has(section.id)) return;
    visiting.add(section.id);
    for (const id of section.dependsOn) {
      if (!sectionIds.includes(id)) invalid("Unknown section dependency");
      visit(sections.find((section) => section.id === id)!);
    }
    visiting.delete(section.id);
    visited.add(section.id);
  };
  sections.forEach(visit);
  const sizes = array(root.sizes, 100).map((value) => {
    const size = object(value, ["id", "label"]);
    return {
      id: identifier(size.id),
      label: requireText(size.label, "size label", 100),
    };
  });
  unique(sizes.map((size) => size.id));
  unique(sizes.map((size) => size.label));
  const issues = array(root.issues, 200).map((value): ReferenceIssue => {
    const issue = object(value, ["id", "reason", "targets"]);
    return {
      id: identifier(issue.id),
      reason: requireText(issue.reason, "issue reason", 1000),
      targets: targets(issue.targets, sections),
    };
  });
  unique(issues.map((issue) => issue.id));
  const coverage = object(root.coverage, [
    "reviewedLineIds",
    "unreviewedLineIds",
  ]);
  const reviewedLineIds = unique(
    array(coverage.reviewedLineIds, lineIds.length).map(identifier),
  );
  const unreviewedLineIds = unique(
    array(coverage.unreviewedLineIds, lineIds.length).map(identifier),
  );
  const covered = unique([...reviewedLineIds, ...unreviewedLineIds]);
  if (
    covered.length !== lineIds.length ||
    covered.some((id) => !lineIds.includes(id))
  ) {
    invalid(
      "Review coverage must account for every original line exactly once",
    );
  }
  const sourceSha256 = hash(root.sourceSha256);
  const textSha256 = hash(root.textSha256);
  if (
    sha256(text) !== textSha256 ||
    (sourceBytes && sha256(sourceBytes) !== sourceSha256)
  ) invalid("Original evidence hash mismatch");
  return {
    schema: 1,
    kind: root.kind,
    sourceSha256,
    textSha256,
    pageCount,
    sections,
    sizes,
    issues,
    coverage: { reviewedLineIds, unreviewedLineIds },
  };
}

export function parseAddition(
  value: unknown,
  reference: OriginalReference,
  existing: InstructionAddition[] = [],
): InstructionAddition {
  const item = object(value, [
    "id",
    "category",
    "targets",
    "text",
    "sizeId",
    "supersedes",
    "resolvesIssueIds",
    "modificationId",
    "attribution",
    "createdAt",
  ]);
  const id = uuid(item.id);
  if (existing.some((record) => record.id === id)) {
    invalid("Addition identifier already exists");
  }
  if (item.category !== "correction" && item.category !== "adaptation") {
    invalid("Invalid addition category");
  }
  const resolvedTargets = array(item.targets, 10).flatMap((value) => {
    const input = requireObject(value);
    if (input.kind !== "addition") return [target(value, reference.sections)];
    object(value, ["kind", "additionId"]);
    const previous = existing.find((record) =>
      record.id === uuid(input.additionId)
    );
    if (!previous) invalid("Unknown addition target");
    return previous.targets;
  });
  const originalTargets = targets(resolvedTargets, reference.sections);
  const supersedes = unique(array(item.supersedes, 100).map(uuid));
  if (supersedes.some((id) => !existing.some((record) => record.id === id))) {
    invalid("Unknown superseded addition");
  }
  const resolvesIssueIds = unique(
    array(item.resolvesIssueIds, 200).map(identifier),
  );
  if (resolvesIssueIds.length && item.category !== "correction") {
    invalid("An adaptation cannot resolve an original reading issue");
  }
  for (const id of resolvesIssueIds) {
    const issue = reference.issues.find((issue) => issue.id === id);
    if (
      !issue ||
      !issue.targets.every((scope) =>
        originalTargets.some((target) => contains(target, scope))
      )
    ) invalid("Correction does not cover the issue it claims to resolve");
  }
  const attribution = object(item.attribution, [
    "actor",
    "channel",
    "clarification",
  ]);
  if (
    attribution.actor !== "owner" ||
    (attribution.channel !== "page" && attribution.channel !== "voice")
  ) invalid("Invalid addition attribution");
  if (
    typeof item.createdAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(item.createdAt) ||
    !Number.isFinite(Date.parse(item.createdAt)) ||
    new Date(item.createdAt).toISOString() !== item.createdAt
  ) invalid("Addition time must be a canonical UTC timestamp");
  let sizeId: string | undefined;
  if (item.sizeId !== undefined) {
    sizeId = identifier(item.sizeId);
    if (!reference.sizes.some((size) => size.id === sizeId)) {
      invalid("Unknown source size");
    }
  }
  return {
    id,
    category: item.category,
    targets: originalTargets,
    text: requireText(item.text, "addition text", 4000),
    sizeId,
    supersedes,
    resolvesIssueIds,
    modificationId: uuid(item.modificationId),
    attribution: {
      actor: "owner",
      channel: attribution.channel,
      clarification: requireText(
        attribution.clarification,
        "owner clarification",
        1000,
      ),
    },
    createdAt: item.createdAt,
  };
}

function contains(outer: OriginalTarget, inner: OriginalTarget): boolean {
  if (outer.kind === "project") return true;
  if (inner.kind === "project" || outer.sectionId !== inner.sectionId) {
    return false;
  }
  if (outer.kind === "section") return true;
  return inner.kind === "passage" && outer.lineId === inner.lineId &&
    outer.start <= inner.start && outer.end >= inner.end;
}

export function activateAddition(
  current: ActiveAddition[],
  addition: InstructionAddition,
): ActiveAddition[] {
  if (current.length >= 1000) {
    throw new HttpError(
      409,
      "addition_limit",
      "Project already has 1,000 additions",
    );
  }
  if (current.some((item) => item.record.id === addition.id)) {
    invalid("Addition identifier already exists");
  }
  if (
    addition.supersedes.some((id) =>
      !current.some((item) => item.record.id === id && item.active)
    )
  ) invalid("Supersession requires an active addition");
  const updated = [
    ...current.map((item) =>
      addition.supersedes.includes(item.record.id)
        ? { ...item, active: false }
        : item
    ),
    { record: addition, active: true },
  ];
  if (
    updated.filter((item) => item.active && item.record.sizeId !== undefined)
      .length > 100
  ) {
    throw new HttpError(
      409,
      "size_override_limit",
      "Project already has 100 active size overrides",
    );
  }
  return updated;
}

export function deactivateAdditions(
  current: ActiveAddition[],
  ids: string[],
): ActiveAddition[] {
  if (
    !ids.length || ids.length > 100 || new Set(ids).size !== ids.length ||
    ids.some((id) => !current.some((item) => item.record.id === id))
  ) invalid("Identify 1-100 distinct existing additions to deactivate");
  return current.map((item) =>
    ids.includes(item.record.id) ? { ...item, active: false } : item
  );
}

export function unresolvedIssues(
  reference: OriginalReference,
  additions: ActiveAddition[],
): ReferenceIssue[] {
  const resolved = new Set(
    additions.filter((item) =>
      item.active && item.record.category === "correction"
    ).flatMap((item) => item.record.resolvesIssueIds),
  );
  return reference.issues.filter((issue) => !resolved.has(issue.id));
}

export function applicableSize(
  reference: OriginalReference,
  defaultSizeId: string | undefined,
  additions: ActiveAddition[],
  scope: OriginalTarget,
): string | undefined {
  target(scope, reference.sections);
  if (
    defaultSizeId !== undefined &&
    !reference.sizes.some((size) => size.id === defaultSizeId)
  ) invalid("Unknown project default size");
  const choices = additions.filter((item) =>
    item.active && item.record.sizeId !== undefined &&
    item.record.targets.some((target) => overlaps(target, scope))
  );
  if (
    choices.some((item) =>
      !item.record.targets.some((target) => contains(target, scope))
    )
  ) {
    throw new HttpError(
      409,
      "size_scope_ambiguous",
      "Request a narrower passage to determine its size",
    );
  }
  const sizes = new Set(choices.map((item) => item.record.sizeId!));
  if (sizes.size > 1) {
    throw new HttpError(
      409,
      "size_conflict",
      "Overlapping active size choices require clarification",
      { additionIds: choices.map((item) => item.record.id) },
    );
  }
  return choices[0]?.record.sizeId ?? defaultSizeId;
}
