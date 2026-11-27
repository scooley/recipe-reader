import { generateKeyPair, SignJWT } from "jose";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { BlobClient, ContainerClient } from "@azure/storage-blob";
import { Auth } from "../src/auth.ts";
import { readConfig } from "../src/config.ts";
import { HttpError, StorageConflict, StorageUncertain } from "../src/errors.ts";
import { Projects } from "../src/projects.ts";
import { sha256 } from "../src/documents.ts";
import { createApp } from "../src/server.ts";
import {
  extractPdf,
  fetchPage,
  isPublicAddress,
  type PageTransport,
  parsePublicUrl,
  pinnedRequestOptions,
} from "../src/sources.ts";
import { AzureStore, MemoryStore } from "../src/storage.ts";

function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
function equal(actual: unknown, expected: unknown): void {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}
async function fails(action: () => unknown, code?: string): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (code) {
      assert(error instanceof HttpError);
      equal(error.code, code);
    }
    return;
  }
  throw new Error("Expected failure");
}
const config = readConfig({
  ASSISTANT_API_TOKEN: "synthetic-service-token-000000000000000000000",
  ENTRA_TENANT_ID: "11111111-1111-4111-8111-111111111111",
  ENTRA_OWNER_OID: "22222222-2222-4222-8222-222222222222",
  ENTRA_SPA_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
  ENTRA_API_AUDIENCE: "44444444-4444-4444-8444-444444444444",
  ENTRA_SCOPE: "access_as_user",
  STORAGE_MODE: "memory",
  ALLOW_INSECURE_LOCAL_DEV: "true",
});

Deno.test("configuration fails closed for missing identifiers or non-loopback memory storage", async () => {
  await fails(() => readConfig({}));
  await fails(() =>
    readConfig({ STORAGE_MODE: "memory", ASSISTANT_API_TOKEN: config.token })
  );
});

Deno.test("Azure startup checks container privacy without ACL-owner privileges and fails closed", async () => {
  const originalProperties = ContainerClient.prototype.getProperties;
  const originalAccessPolicy = ContainerClient.prototype.getAccessPolicy;
  const store = new AzureStore({
    ...config,
    storageMode: "azure",
    storageAccountUrl: "https://syntheticaccount.blob.core.windows.net",
    storageContainer: "assistant",
  });
  ContainerClient.prototype.getAccessPolicy = () => {
    throw new Error("Startup must not require ACL-owner privileges");
  };
  try {
    const properties: Awaited<ReturnType<ContainerClient["getProperties"]>> = {
      get _response(): never {
        throw new Error(
          "Privacy verification should only inspect parsed headers",
        );
      },
    };
    ContainerClient.prototype.getProperties = () => Promise.resolve(properties);
    await store.verifyPrivateContainer();
    for (const blobPublicAccess of ["blob", "container"] as const) {
      properties.blobPublicAccess = blobPublicAccess;
      await fails(() => store.verifyPrivateContainer());
    }
    ContainerClient.prototype.getProperties = () =>
      Promise.reject(new Error("Storage authorization failed"));
    await fails(() => store.verifyPrivateContainer());
  } finally {
    ContainerClient.prototype.getProperties = originalProperties;
    ContainerClient.prototype.getAccessPolicy = originalAccessPolicy;
  }
});

Deno.test("auth validates signed Entra claims, token class and service-token rotation", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const auth = new Auth({
    ...config,
    previousToken: "previous-synthetic-token-000000000000000",
  }, () => Promise.resolve(publicKey));
  const request = (token?: string) =>
    new Request("https://assistant.invalid/v1/state", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  const mint = (
    claims: Record<string, unknown> = {},
    audience = config.audience,
    expiry = "5m",
  ) =>
    new SignJWT({
      tid: config.tenantId,
      oid: config.ownerOid,
      scp: config.scope,
      ver: "2.0",
      ...claims,
    })
      .setProtectedHeader({ alg: "RS256" }).setIssuer(
        `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
      )
      .setAudience(audience).setExpirationTime(expiry).sign(privateKey);
  await fails(() => auth.authorize(request(), "voice"), "unauthorized");
  await fails(() => auth.authorize(request("bad"), "voice"), "unauthorized");
  equal(await auth.authorize(request(config.token), "voice"), "voice");
  await fails(
    () => auth.authorize(request(config.token), "page"),
    "wrong_caller",
  );
  const page = await mint();
  equal(await auth.authorize(request(page), "page"), "page");
  await fails(() => auth.authorize(request(page), "voice"), "wrong_caller");
  for (
    const claims of [
      { oid: crypto.randomUUID() },
      { tid: crypto.randomUUID() },
      { scp: "wrong" },
    ]
  ) {
    const invalid = await mint(claims);
    await fails(() => auth.authorize(request(invalid), "page"), "forbidden");
  }
  for (
    const invalid of [
      await mint({}, "wrong"),
      await mint({}, config.audience, "-1h"),
      await mint({ ver: "1.0" }),
    ]
  ) {
    await fails(() => auth.authorize(request(invalid), "page"), "unauthorized");
  }
  const previous = "previous-synthetic-token-000000000000000";
  equal(await auth.authorize(request(previous), "voice"), "voice");
  await fails(
    () => new Auth(config).authorize(request(previous), "voice"),
    "unauthorized",
  );
});

Deno.test("progress, corrections, modifications and selection persist independently", async () => {
  const store = new MemoryStore();
  const projects = new Projects(store);
  const first = await projects.create("Synthetic sleeve");
  const other = await projects.create("Soup");
  await projects.select(first.id);
  const changed = await projects.reportModification(first.id, 1, {
    location: "sleeve",
    change: "Shorten by two rows",
    consequences: ["Re-space increases"],
    pendingFollowUps: ["Repeat on second sleeve"],
  });
  equal(changed.progress, null);
  const reported = await projects.reportProgress(
    first.id,
    2,
    "row 10",
    "Finished row 10",
  );
  const corrected = await projects.reportProgress(
    first.id,
    3,
    "row 9",
    "Correction: only row 9 is done",
  );
  equal(corrected.progress?.location, "row 9");
  equal(corrected.progressHistory.length, 2);
  equal(corrected.modifications[0].followUps[0].appliedAt, undefined);
  await fails(
    () =>
      projects.reportProgress(
        first.id,
        reported.revision,
        "row 20",
        "Stale report",
      ),
    "revision_conflict",
  );
  await projects.detail(other.id);
  await projects.list();
  equal((await new Projects(store).state()).activeProject?.id, first.id);
  const applied = await projects.applyFollowUp(
    first.id,
    changed.modifications[0].followUps[0].id,
    corrected.revision,
    "Applied to second sleeve",
  );
  assert(applied.modifications[0].followUps[0].appliedAt);
  equal(applied.progress?.location, "row 9");
  const saved = await store.get(`projects/${first.id}/project.md`);
  assert(
    saved && new TextDecoder().decode(saved.bytes).includes("## Modifications"),
  );
});

Deno.test("concurrent ETag writes cannot overwrite another report", async () => {
  const projects = new Projects(new MemoryStore());
  const project = await projects.create("Race");
  const results = await Promise.allSettled([
    projects.reportProgress(project.id, 1, "one", "one"),
    projects.reportProgress(project.id, 1, "two", "two"),
  ]);
  equal(results.filter((item) => item.status === "fulfilled").length, 1);
  const rejected = results.find((item) => item.status === "rejected");
  assert(
    rejected?.status === "rejected" && rejected.reason instanceof HttpError,
  );
  equal(rejected.reason.code, "revision_conflict");
});

Deno.test("completion removes private PDF and text but keeps notes; deletion requires exact confirmation", async () => {
  const store = new MemoryStore();
  const projects = new Projects(store);
  const project = await projects.create("Test pattern");
  await projects.select(project.id);
  const attached = await projects.attach(project.id, 1, {
    kind: "pdf",
    label: "test.pdf",
    text: "Original synthetic instructions",
    pdf: new Uint8Array([1, 2]),
  });
  await fails(
    () =>
      projects.attach(project.id, attached.revision, {
        kind: "web",
        label: "other",
        text: "other",
      }),
    "source_exists",
  );
  const done = await projects.complete(project.id, attached.revision);
  equal(done.source?.available, false);
  equal((await projects.state()).activeProject, null);
  equal((await store.list(`projects/${project.id}/sources/`)).length, 0);
  assert(await store.get(`projects/${project.id}/project.md`));
  await fails(() => projects.sourceText(project.id), "not_found");
  await fails(
    () => projects.delete(project.id, done.revision, "wrong"),
    "title_mismatch",
  );
  await projects.delete(project.id, done.revision, project.title);
  equal((await projects.list()).length, 0);
});

Deno.test("failed cleanup is explicit and completion/deletion can be retried", async () => {
  class FailingStore extends MemoryStore {
    fail = true;
    override async remove(key: string, etag?: string): Promise<void> {
      if (this.fail && key.includes("/sources/")) {
        throw new Error("Synthetic storage failure");
      }
      await super.remove(key, etag);
    }
  }
  const store = new FailingStore();
  const projects = new Projects(store);
  const project = await projects.create("Cleanup");
  await projects.attach(project.id, 1, {
    kind: "web",
    label: "synthetic",
    text: "Synthetic text",
  });
  await fails(() => projects.complete(project.id, 2), "partial_completion");
  equal((await projects.detail(project.id)).status, "completed");
  store.fail = false;
  await projects.complete(project.id, 3);
  const next = await projects.create("Delete retry");
  await projects.attach(next.id, 1, {
    kind: "web",
    label: "synthetic",
    text: "Synthetic text",
  });
  store.fail = true;
  await fails(
    () => projects.delete(next.id, 2, next.title),
    "partial_deletion",
  );
  store.fail = false;
  await projects.delete(next.id, 3, next.title);
  await fails(() => projects.detail(next.id), "not_found");
});

Deno.test("uncertain upload commits never delete a referenced source", async () => {
  class UncertainStore extends MemoryStore {
    override async put(
      ...args: Parameters<MemoryStore["put"]>
    ): Promise<string> {
      const etag = await super.put(...args);
      if (args[0].endsWith("project.md") && "ifMatch" in args[3]) {
        throw new Error("Response lost after commit");
      }
      return etag;
    }
  }
  const store = new UncertainStore();
  const projects = new Projects(store);
  const project = await projects.create("Uncertain commit");
  await projects.attach(project.id, 1, {
    kind: "web",
    label: "synthetic",
    text: "Keep this source",
  });
  equal((await projects.sourceText(project.id)).text, "Keep this source");
});

Deno.test("failed staged upload is cleaned up without marking source available", async () => {
  class FailingStore extends MemoryStore {
    override async put(
      ...args: Parameters<MemoryStore["put"]>
    ): Promise<string> {
      if (args[0].endsWith("source.txt")) {
        throw new Error("Synthetic failed text upload");
      }
      return await super.put(...args);
    }
  }
  const store = new FailingStore();
  const projects = new Projects(store);
  const project = await projects.create("Failed upload");
  await fails(() =>
    projects.attach(project.id, 1, {
      kind: "pdf",
      label: "synthetic.pdf",
      text: "Synthetic text",
      pdf: new Uint8Array([1]),
    })
  );
  equal((await projects.detail(project.id)).source, null);
  equal((await store.list(`projects/${project.id}/sources/`)).length, 0);
});

function barrier(): {
  reached: Promise<void>;
  release: () => void;
  pause: () => Promise<void>;
} {
  let arrived!: () => void;
  let release!: () => void;
  const reached = new Promise<void>((resolve) => arrived = resolve);
  const wait = new Promise<void>((resolve) => release = resolve);
  return {
    reached,
    release,
    pause: () => {
      arrived();
      return wait;
    },
  };
}

class DelayedSourceStore extends MemoryStore {
  readonly gate = barrier();
  private paused = false;

  constructor(
    private readonly point: "placeholder" | "content" | "content-reply",
  ) {
    super();
  }

  override async put(...args: Parameters<MemoryStore["put"]>): Promise<string> {
    const [key, bytes] = args;
    const pause = !this.paused && key.endsWith("source.txt") &&
      (this.point === "placeholder" ? bytes.length === 0 : bytes.length > 0);
    if (!pause) return await super.put(...args);
    this.paused = true;
    if (this.point === "content-reply") {
      const etag = await super.put(...args);
      await this.gate.pause();
      return etag;
    }
    await this.gate.pause();
    return await super.put(...args);
  }
}

for (const point of ["placeholder", "content", "content-reply"] as const) {
  Deno.test(`completion fences delayed ${point} writes without claiming pending cleanup succeeded`, async () => {
    const store = new DelayedSourceStore(point);
    const projects = new Projects(store);
    const project = await projects.create("Delayed source");
    const pending = projects.attach(project.id, 1, {
      kind: "web",
      label: "synthetic",
      text: "Private synthetic instructions",
    }).then(() => null, (error: unknown) => error);
    await store.gate.reached;
    try {
      // Registration is internal: it must not consume the owner's public revision.
      equal((await projects.detail(project.id)).revision, 1);
      await fails(() => projects.complete(project.id, 1), "partial_completion");
      equal((await store.list(`projects/${project.id}/sources/`)).length, 0);
      await fails(() => projects.sourceText(project.id), "not_found");
    } finally {
      store.gate.release();
    }
    const error = await pending;
    assert(error instanceof HttpError);
    equal(error.code, "project_closed");
    await projects.complete(project.id, 2);
    equal((await store.list(`projects/${project.id}/sources/`)).length, 0);
  });
}

Deno.test("deletion retains its recovery root until an in-flight source writer has settled", async () => {
  const store = new DelayedSourceStore("content");
  const projects = new Projects(store);
  const project = await projects.create("Deletion race");
  const pending = projects.attach(project.id, 1, {
    kind: "web",
    label: "synthetic",
    text: "Must never survive deletion",
  }).then(() => null, (error: unknown) => error);
  await store.gate.reached;
  try {
    await fails(
      () => projects.delete(project.id, 1, project.title),
      "partial_deletion",
    );
    assert(await store.stat(`projects/${project.id}/project.md`));
  } finally {
    store.gate.release();
  }
  assert(await pending instanceof HttpError);
  await projects.delete(project.id, 2, project.title);
  equal(await store.list(`projects/${project.id}/`), []);
});

Deno.test("a missing root prevents a delayed placeholder from acquiring source content", async () => {
  const store = new DelayedSourceStore("placeholder");
  const projects = new Projects(store);
  const project = await projects.create("Missing root race");
  const pending = projects.attach(project.id, 1, {
    kind: "web",
    label: "synthetic",
    text: "Must not be written without a root",
  }).then(() => null, (error: unknown) => error);
  await store.gate.reached;
  const key = `projects/${project.id}/project.md`;
  const root = await store.stat(key);
  assert(root);
  await store.remove(key, root.etag);
  store.gate.release();
  const error = await pending;
  assert(error instanceof HttpError && error.code === "source_save_uncertain");
  const markers = await store.list(`projects/${project.id}/sources/`);
  equal(markers.length, 1);
  equal((await store.stat(markers[0]))?.size, 0);
});

Deno.test("late source publication cannot overwrite newer progress and a source read cannot outlive completion", async () => {
  const store = new DelayedSourceStore("content");
  const projects = new Projects(store);
  const project = await projects.create("Progress race");
  const pending = projects.attach(project.id, 1, {
    kind: "web",
    label: "synthetic",
    text: "Original instructions",
  }).then(() => null, (error: unknown) => error);
  await store.gate.reached;
  try {
    await projects.reportProgress(project.id, 1, "setup", "Prepared needles");
  } finally {
    store.gate.release();
  }
  const error = await pending;
  assert(error instanceof HttpError && error.code === "revision_conflict");
  const detail = await projects.detail(project.id);
  equal(detail.progress?.report, "Prepared needles");
  equal(detail.source, null);
  equal(await store.list(`projects/${project.id}/sources/`), []);

  class DelayedReadStore extends MemoryStore {
    readonly gate = barrier();
    delay = false;
    override async get(
      ...args: Parameters<MemoryStore["get"]>
    ): ReturnType<MemoryStore["get"]> {
      const value = await super.get(...args);
      if (this.delay && args[0].endsWith("source.txt")) {
        this.delay = false;
        await this.gate.pause();
      }
      return value;
    }
  }
  const reads = new DelayedReadStore();
  const reading = new Projects(reads);
  const other = await reading.create("Read race");
  await reading.attach(other.id, 1, {
    kind: "web",
    label: "synthetic",
    text: "Private source before completion",
  });
  reads.delay = true;
  const read = reading.sourceText(other.id).then(
    () => null,
    (error: unknown) => error,
  );
  await reads.gate.reached;
  try {
    await reading.complete(other.id, 2);
  } finally {
    reads.gate.release();
  }
  const readError = await read;
  assert(readError instanceof HttpError && readError.code === "not_found");
});

Deno.test("registered evidence hashes remain distinct and corrupt source bytes are never served", async () => {
  const store = new MemoryStore();
  const projects = new Projects(store);
  const project = await projects.create("Evidence hashes");
  const text = "Checked synthetic instructions";
  const pdf = new Uint8Array([1, 2, 3]);
  await projects.attach(project.id, 1, {
    kind: "pdf",
    label: "synthetic.pdf",
    text,
    pdf,
  });

  const root = await store.get(`projects/${project.id}/project.md`);
  assert(root);
  const metadata = JSON.parse(
    new TextDecoder().decode(root.bytes).split("\n")[1],
  );
  equal(metadata.schema, 2);
  equal(metadata.source.digest, sha256(text));
  equal(metadata.source.pdfDigest, sha256(pdf));
  assert(!JSON.stringify(metadata.sourceFence).includes(text));
  const key = metadata.source.textPath;
  const original = await store.stat(key);
  assert(original);
  await store.put(key, new TextEncoder().encode("Corrupt text"), "text/plain", {
    ifMatch: original.etag,
  });
  await fails(() => projects.sourceText(project.id), "invalid_source");
});

Deno.test("an ambiguous content PUT cannot arrive after cleanup and recreate source bytes", async () => {
  class UncertainBodyStore extends MemoryStore {
    lateWrite?: () => Promise<string>;
    override async put(
      ...args: Parameters<MemoryStore["put"]>
    ): Promise<string> {
      if (
        !this.lateWrite && args[0].endsWith("source.txt") && args[1].length > 0
      ) {
        this.lateWrite = () => super.put(...args);
        throw new StorageUncertain("put", args[0]);
      }
      return await super.put(...args);
    }
  }
  const store = new UncertainBodyStore();
  const projects = new Projects(store);
  const project = await projects.create("Ambiguous source PUT");
  await fails(
    () =>
      projects.attach(project.id, 1, {
        kind: "web",
        label: "synthetic",
        text: "Private content must not reappear",
      }),
    "source_save_uncertain",
  );
  assert(store.lateWrite);
  await fails(store.lateWrite);
  equal(await store.list(`projects/${project.id}/sources/`), []);
  equal((await projects.detail(project.id)).source, null);
  await projects.complete(project.id, 1);
});

Deno.test("metadata-only Azure stat does not download content and memory listings exclude source artifacts", async () => {
  const original = BlobClient.prototype.getProperties;
  try {
    BlobClient.prototype.getProperties = () =>
      Promise.resolve({
        etag: '"synthetic-etag"',
        contentLength: 25 * 1024 * 1024,
        get _response(): never {
          throw new Error("Stat must use metadata only");
        },
      });
    const azure = new AzureStore({
      ...config,
      storageMode: "azure",
      storageAccountUrl: "https://syntheticaccount.blob.core.windows.net",
      storageContainer: "assistant",
    });
    equal(await azure.stat("synthetic.pdf"), {
      etag: '"synthetic-etag"',
      size: 25 * 1024 * 1024,
    });
  } finally {
    BlobClient.prototype.getProperties = original;
  }
  const store = new MemoryStore();
  const project = await new Projects(store).create("Listing");
  for (let index = 0; index < 1001; index++) {
    await store.put(
      `projects/${project.id}/sources/${index}`,
      new Uint8Array(),
      "application/octet-stream",
      { ifNoneMatch: true },
    );
  }
  equal(await store.listProjectRecords(), [
    `projects/${project.id}/project.md`,
  ]);
  await fails(
    () => store.list(`projects/${project.id}/sources/`),
    "storage_list_limit",
  );
  await fails(() => store.get("key", { signal: AbortSignal.abort() }));
});

const html =
  "<!doctype html><html><body><h1>Original synthetic soup recipe</h1><p>Combine two cups of water with one cup of lentils. Simmer for twenty minutes. Stir, check texture, and serve in two bowls.</p><script>doNotExecute()</script></body></html>";
function transport(overrides: Partial<PageTransport> = {}): PageTransport {
  return {
    resolve: () => Promise.resolve([{ address: "93.184.216.34", family: 4 }]),
    download: () =>
      Promise.resolve({
        status: 200,
        contentType: "text/html; charset=utf-8",
        bytes: new TextEncoder().encode(html),
      }),
    ...overrides,
  };
}
Deno.test("web imports reject private destinations, redirects and unsafe syntax; only checked text is returned", async () => {
  for (
    const url of [
      "http://example.org",
      "https://127.0.0.1",
      "https://[::1]",
      "https://user@example.org",
      "https://example.org:444",
      "https://example.org/#x",
      "https://example.org\\@localhost",
    ]
  ) {
    await fails(() => parsePublicUrl(url), "unsafe_url");
  }
  for (
    const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "169.254.169.254",
      "192.168.1.1",
      "::1",
      "::ffff:127.0.0.1",
      "2001:db8::1",
      "100.64.0.1",
      "192.0.0.1",
    ]
  ) assert(!isPublicAddress(ip), ip);
  let downloaded = false;
  await fails(() =>
    fetchPage(
      "https://example.org/recipe",
      transport({
        resolve: () => Promise.resolve([{ address: "10.0.0.1", family: 4 }]),
        download: () => {
          downloaded = true;
          throw new Error("Must not download");
        },
      }),
    ), "unsafe_destination");
  assert(!downloaded);
  await fails(() =>
    fetchPage(
      "https://example.org/recipe",
      transport({
        download: () =>
          Promise.resolve({
            status: 302,
            contentType: "text/html",
            bytes: new Uint8Array(),
          }),
      }),
    ), "redirect_not_allowed");
  const source = await fetchPage("https://example.org/recipe", transport());
  assert(
    source.text.includes("lentils") && !source.text.includes("doNotExecute"),
  );
  await fails(() =>
    fetchPage(
      "https://example.org/recipe",
      transport({
        download: () =>
          Promise.resolve({
            status: 200,
            contentType: "text/html",
            bytes: new TextEncoder().encode(
              '<html><body><input type="password"></body></html>',
            ),
          }),
      }),
    ), "unusable_source");
});

Deno.test("connection options pin validated DNS address while keeping original TLS name", () => {
  const options = pinnedRequestOptions(new URL("https://example.org/recipe"), {
    address: "93.184.216.34",
    family: 4,
  });
  equal(options.servername, "example.org");
  equal(options.rejectUnauthorized, true);
  assert(typeof options.lookup === "function");
  options.lookup("example.org", {}, (error, address, family) => {
    equal(error, null);
    equal(address, "93.184.216.34");
    equal(family, 4);
  });
});

Deno.test("PDF extraction preserves page order and refuses unreadable or layout-dependent sources", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (
    const text of [
      "First sleeve: work rows one through ten. Sizes small and large use different counts.",
      "Second sleeve: repeat the same shaping change discussed for the first sleeve.",
    ]
  ) {
    doc.addPage().drawText(text, { x: 30, y: 700, size: 10, font });
  }
  const source = await extractPdf(await doc.save(), "original.pdf");
  assert(
    source.text.indexOf("First sleeve") < source.text.indexOf("Second sleeve"),
  );
  await fails(
    () => extractPdf(new TextEncoder().encode("not a PDF"), "invalid.pdf"),
    "invalid_pdf",
  );
  const blank = await PDFDocument.create();
  blank.addPage();
  await fails(
    async () => extractPdf(await blank.save(), "scan.pdf"),
    "unusable_source",
  );
  const drawing = await PDFDocument.create();
  const page = drawing.addPage();
  page.drawText(
    "Synthetic text that is long enough to otherwise extract as source instructions.",
  );
  page.drawRectangle({ x: 10, y: 10, width: 100, height: 100 });
  await fails(
    async () => extractPdf(await drawing.save(), "chart.pdf"),
    "unusable_source",
  );
});

Deno.test("HTTP routes enforce named capabilities and never expose uploads/deletion to voice", async () => {
  const app = createApp({ ...config, authProbe: true }, new MemoryStore());
  const call = (
    path: string,
    method = "GET",
    body?: unknown,
    token = config.token,
  ) =>
    app(
      new Request(`https://assistant.invalid${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  equal((await call("/v1/state", "GET", undefined, "bad")).status, 401);
  equal((await call("/v1/auth-probe")).status, 200);
  const created = await call("/v1/projects", "POST", {
    title: "Synthetic HTTP project",
  });
  equal(created.status, 201);
  const project = await created.json();
  equal(
    (await call(`/v1/projects/${project.id}/source/url`, "POST", {})).status,
    403,
  );
  equal(
    (await call(`/v1/projects/${project.id}/source`, "POST", {})).status,
    403,
  );
  equal(
    (await call(`/v1/projects/${project.id}/delete`, "POST", {})).status,
    403,
  );
  equal(
    (await call(`/v1/projects/${project.id}/progress`, "POST", {
      expectedRevision: 1,
      location: "row 1",
      report: "done",
    })).status,
    409,
  );
  await call(`/v1/projects/${project.id}/select`, "POST", {});
  equal(
    (await call(`/v1/projects/${project.id}/progress`, "POST", {
      expectedRevision: 1,
      location: "row 1",
      report: "done",
    })).status,
    200,
  );
  for (
    const path of [
      "/v1/projects/search",
      "/v1/patterns/search",
      `/v1/projects/${project.id}/source/ravelry`,
    ]
  ) {
    const response = await call(path, "POST", { description: "test" });
    equal(response.status, 501);
    equal((await response.json()).error.code, "ravelry_unavailable");
  }
  equal((await call("/v1/ravelry/purchase", "POST", {})).status, 404);
  const missingProbe = createApp(config, new MemoryStore());
  equal(
    (await missingProbe(new Request("https://assistant.invalid/v1/auth-probe")))
      .status,
    404,
  );
});

Deno.test("storage conditional deletes reject stale ETags", async () => {
  const store = new MemoryStore();
  const etag = await store.put("key", new Uint8Array([1]), "text/plain", {
    ifNoneMatch: true,
  });
  await store.put("key", new Uint8Array([2]), "text/plain", { ifMatch: etag });
  try {
    await store.remove("key", etag);
  } catch (error) {
    assert(error instanceof StorageConflict);
    return;
  }
  throw new Error("Expected stale delete to fail");
});

Deno.test("page APIs accept only signed owner tokens; source selection and static redirect bridge are enforced", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const pageToken = await new SignJWT({
    tid: config.tenantId,
    oid: config.ownerOid,
    scp: config.scope,
    ver: "2.0",
  })
    .setProtectedHeader({ alg: "RS256" }).setIssuer(
      `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
    )
    .setAudience(config.audience).setExpirationTime("5m").sign(privateKey);
  const store = new MemoryStore();
  const app = createApp(config, store, {
    auth: new Auth(config, () => Promise.resolve(publicKey)),
    pageTransport: transport(),
  });
  const call = (
    path: string,
    method = "GET",
    body?: unknown,
    token = pageToken,
  ) =>
    app(
      new Request(`https://assistant.invalid${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  const created = await call("/v1/projects", "POST", {
    title: "Synthetic page source",
  });
  equal(created.status, 201);
  const project = await created.json();
  const attached = await call(
    `/v1/projects/${project.id}/source/url`,
    "POST",
    { expectedRevision: 1, url: "https://example.org/recipe" },
  );
  equal(attached.status, 200);
  const sourcePath = `/v1/projects/${project.id}/source-text`;
  equal((await call(sourcePath)).status, 403);
  equal((await call(sourcePath, "GET", undefined, config.token)).status, 409);
  equal(
    (await call(`/v1/projects/${project.id}/select`, "POST", {})).status,
    200,
  );
  const text = await call(sourcePath, "GET", undefined, config.token);
  equal(text.status, 200);
  assert((await text.json()).text.includes("lentils"));
  equal(
    (await call(`/v1/projects/${project.id}/progress`, "POST", {})).status,
    403,
  );
  const page = await call("/manage/");
  equal(page.status, 200);
  assert(
    page.headers.get("content-security-policy")?.includes(
      "script-src 'self' 'nonce-",
    ),
  );
  const callback = await call("/manage/redirect");
  const markup = await callback.text();
  assert(
    markup.includes('src="/manage/redirect.js"') &&
      !markup.includes('src="/manage/app.js"'),
  );
  equal(callback.headers.get("cross-origin-opener-policy"), null);
  equal(
    (await (await call("/manage/config.json")).json()).redirectPath,
    "/manage/redirect",
  );
  equal(
    (await (await app(
      new Request("http://assistant.invalid/manage/config.json"),
    ))
      .json()).redirectPath,
    "/manage/redirect",
  );
  equal(
    (await call(`/v1/projects/${project.id}/delete`, "POST", {
      expectedRevision: 2,
      confirmTitle: project.title,
    })).status,
    200,
  );
  equal((await store.list("projects/")).length, 0);
});
