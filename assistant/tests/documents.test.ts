import { deepStrictEqual } from "node:assert/strict";
import {
  activateAddition,
  type ActiveAddition,
  applicableSize,
  deactivateAdditions,
  type InstructionAddition,
  type OriginalReference,
  type OriginalTarget,
  parseAddition,
  parseReference,
  sha256,
  unresolvedIssues,
} from "../src/documents.ts";
import { HttpError } from "../src/errors.ts";

function assert(value: unknown): asserts value {
  if (!value) throw new Error("Assertion failed");
}

function equal(actual: unknown, expected: unknown): void {
  deepStrictEqual(actual, expected);
}

function fails(action: () => unknown, code?: string): void {
  try {
    action();
  } catch (error) {
    assert(error instanceof HttpError);
    if (code) equal(error.code, code);
    return;
  }
  throw new Error("Expected invalid document to fail");
}

const source = new TextEncoder().encode(
  "Synthetic original PDF bytes, not extracted text",
);

function reference(): OriginalReference {
  const sections: OriginalReference["sections"] = [
    {
      id: "body",
      title: "Body",
      dependsOn: [],
      lines: [
        {
          id: "body-1",
          text: "Sizes: 1 2 3 4 5 6 7 8",
          page: 1,
          kind: "instruction",
        },
        {
          id: "body-2",
          text: "Work 10 cm, then 10 cm.",
          page: 1,
          kind: "instruction",
        },
      ],
    },
    {
      id: "sleeve",
      title: "Sleeve",
      dependsOn: ["body"],
      lines: [{
        id: "sleeve-1",
        text: "Work 12 (14, 16, 18, 20, 22, 24, 26) rows.",
        page: 2,
        kind: "instruction",
      }],
    },
  ];
  return {
    schema: 1,
    kind: "pdf",
    sourceSha256: sha256(source),
    textSha256: sha256(
      sections.flatMap((section) => section.lines.map((line) => line.text))
        .join("\n"),
    ),
    pageCount: 2,
    sections,
    sizes: Array.from(
      { length: 8 },
      (_, index) => ({ id: `size-${index + 1}`, label: `${index + 1}` }),
    ),
    issues: [{
      id: "reading-1",
      reason: "Confirm which measurement applies",
      targets: [{ kind: "section", sectionId: "body" }],
    }],
    coverage: {
      reviewedLineIds: [],
      unreviewedLineIds: ["body-1", "body-2", "sleeve-1"],
    },
  };
}

function addition(
  overrides: Partial<InstructionAddition> = {},
): InstructionAddition {
  return {
    id: crypto.randomUUID(),
    category: "adaptation",
    targets: [{ kind: "section", sectionId: "sleeve" }],
    text: "Use the explicitly chosen sleeve size.",
    sizeId: "size-2",
    supersedes: [],
    resolvesIssueIds: [],
    modificationId: crypto.randomUUID(),
    attribution: {
      actor: "owner",
      channel: "voice",
      clarification: "Owner explicitly requested size 2 for the sleeve.",
    },
    createdAt: "2026-11-26T00:00:00.000Z",
    ...overrides,
  };
}

Deno.test("reference validation preserves ordered all-size evidence and distinguishes PDF and text hashes", () => {
  const input = reference();
  const parsed = parseReference(input, source);
  equal(parsed.sizes.map((size) => size.label), [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
  ]);
  equal(parsed.sections, input.sections);
  assert(parsed.sourceSha256 !== parsed.textSha256);
  equal(parsed.coverage.reviewedLineIds, []);
  fails(() => parseReference(input, new Uint8Array([0])));
  input.sections[0].lines[0].text = "Dropped seven sizes";
  fails(() => parseReference(input), "invalid_document");
});

Deno.test("reference metadata rejects missing coverage, duplicate anchors, dependency cycles and unknown sizes", () => {
  for (
    const change of [
      (value: OriginalReference) => value.coverage.unreviewedLineIds.pop(),
      (value: OriginalReference) =>
        value.coverage.reviewedLineIds.push("body-1"),
      (value: OriginalReference) => value.sections[1].lines[0].id = "body-1",
      (value: OriginalReference) => value.sections[0].dependsOn.push("sleeve"),
      (value: OriginalReference) => value.sections[0].dependsOn.push("missing"),
      (value: OriginalReference) => value.sizes.push(value.sizes[0]),
      (value: OriginalReference) => value.sections[0].lines[0].page = 3,
    ]
  ) {
    const input = reference();
    change(input);
    fails(() => parseReference(input));
  }
});

Deno.test("passage targets require exact offsets within the specified original line", () => {
  const original = parseReference(reference());
  const occurrence: OriginalTarget = {
    kind: "passage",
    sectionId: "body",
    lineId: "body-2",
    start: 17,
    end: 22,
    quote: "10 cm",
  };
  const record = addition({ targets: [occurrence] });
  equal(parseAddition(record, original).targets, [occurrence]);
  for (
    const target of [
      { ...occurrence, start: 5, end: 10, quote: "99 cm" },
      { ...occurrence, sectionId: "sleeve" },
      { ...occurrence, lineId: "missing" },
      { ...occurrence, start: 16 },
      { ...occurrence, end: 999 },
      { kind: "passage", sectionId: "body", quote: "10 cm" },
    ]
  ) fails(() => parseAddition({ ...record, targets: [target] }, original));
  fails(() =>
    parseAddition({ ...record, targets: [occurrence, occurrence] }, original)
  );
  fails(() =>
    parseAddition({
      ...record,
      targets: [{ kind: "section", sectionId: "body" }, occurrence],
    }, original)
  );
});

Deno.test("addition references resolve original scopes and supersession is explicit and atomic", () => {
  const original = parseReference(reference());
  const previous = parseAddition(addition(), original);
  const unrelated = parseAddition(
    addition({
      targets: [{ kind: "section", sectionId: "body" }],
      sizeId: undefined,
    }),
    original,
  );
  const replacement = parseAddition(
    {
      ...addition({ sizeId: "size-3", supersedes: [previous.id] }),
      targets: [{ kind: "addition", additionId: previous.id }],
    },
    original,
    [previous, unrelated],
  );
  equal(replacement.targets, previous.targets);
  const current = [{ record: previous, active: true }, {
    record: unrelated,
    active: true,
  }];
  const updated = activateAddition(current, replacement);
  equal(updated.map((item) => item.active), [false, true, true]);
  equal(current.map((item) => item.active), [true, true]);
  fails(() =>
    parseAddition(
      {
        ...addition(),
        targets: [{ kind: "addition", additionId: crypto.randomUUID() }],
      },
      original,
      [previous],
    )
  );
  fails(() =>
    parseAddition(addition({ supersedes: [crypto.randomUUID()] }), original, [
      previous,
    ])
  );
  fails(() =>
    activateAddition(deactivateAdditions(current, [previous.id]), replacement)
  );
});

Deno.test("only an active attributed correction resolves an issue; deactivation reopens it without rewriting evidence", () => {
  const original = parseReference(reference());
  const correction = parseAddition(
    addition({
      category: "correction",
      sizeId: undefined,
      targets: [{ kind: "section", sectionId: "body" }],
      resolvesIssueIds: ["reading-1"],
    }),
    original,
  );
  const active = activateAddition([], correction);
  equal(unresolvedIssues(original, active), []);
  equal(
    unresolvedIssues(original, deactivateAdditions(active, [correction.id])),
    original.issues,
  );
  equal(original, reference());
  fails(() =>
    parseAddition({ ...correction, category: "adaptation" }, original)
  );
  fails(() =>
    parseAddition({
      ...correction,
      targets: [{ kind: "section", sectionId: "sleeve" }],
    }, original)
  );
  fails(() =>
    parseAddition({
      ...correction,
      attribution: { actor: "owner", channel: "voice", clarification: "" },
    }, original)
  );
});

Deno.test("explicit local sizes override the default without silently mixing scopes or contradictory sizes", () => {
  const original = parseReference(reference());
  const override = parseAddition(addition(), original);
  const current = activateAddition([], override);
  equal(
    applicableSize(original, "size-1", current, {
      kind: "section",
      sectionId: "sleeve",
    }),
    "size-2",
  );
  equal(
    applicableSize(original, "size-1", current, {
      kind: "section",
      sectionId: "body",
    }),
    "size-1",
  );
  equal(
    applicableSize(original, undefined, [], {
      kind: "section",
      sectionId: "body",
    }),
    undefined,
  );
  fails(
    () => applicableSize(original, "size-1", current, { kind: "project" }),
    "size_scope_ambiguous",
  );
  const conflicting = parseAddition(addition({ sizeId: "size-3" }), original);
  fails(
    () =>
      applicableSize(original, "size-1", [...current, {
        record: conflicting,
        active: true,
      }], { kind: "section", sectionId: "sleeve" }),
    "size_conflict",
  );
  fails(() => applicableSize(original, "missing", [], { kind: "project" }));
});

Deno.test("addition capacity never prevents deactivating existing changes", () => {
  const current: ActiveAddition[] = Array.from(
    { length: 1000 },
    () => ({ record: addition({ sizeId: undefined }), active: true }),
  );
  fails(() => activateAddition(current, addition()), "addition_limit");
  const updated = deactivateAdditions(current, [current[0].record.id]);
  equal(updated.length, 1000);
  equal(updated[0].active, false);
  equal(updated[1].active, true);
});
