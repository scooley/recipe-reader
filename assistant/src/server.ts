import { type Access, Auth } from "./auth.ts";
import { type Config, parseJson } from "./config.ts";
import { HttpError, requireObject, requireRevision } from "./errors.ts";
import { Projects } from "./projects.ts";
import {
  extractPdf,
  fetchPage,
  MAX_PDF_BYTES,
  type PageTransport,
} from "./sources.ts";
import type { ObjectStore } from "./storage.ts";

const JSON_LIMIT = 16 * 1024;
const UPLOAD_LIMIT = MAX_PDF_BYTES + 256 * 1024;

const baseHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...baseHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

async function readBody(request: Request, limit: number): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > limit) {
    throw new HttpError(
      413,
      "body_too_large",
      "Request body exceeds the allowed size",
    );
  }
  if (!request.body) {
    throw new HttpError(400, "invalid_input", "Request body is required");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {
        await reader.cancel();
        throw new HttpError(
          413,
          "body_too_large",
          "Request body exceeds the allowed size",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function bodyJson(request: Request): Promise<Record<string, unknown>> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/json"
  ) {
    throw new HttpError(415, "unsupported_body", "Expected application/json");
  }
  const bytes = await readBody(request, JSON_LIMIT);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HttpError(400, "invalid_json", "Expected UTF-8 JSON");
  }
  return requireObject(parseJson<unknown>(text));
}

async function uploadForm(request: Request): Promise<{
  revision: number;
  file: File;
}> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(type)) {
    throw new HttpError(
      415,
      "unsupported_body",
      "Expected multipart/form-data",
    );
  }
  const bytes = await readBody(request, UPLOAD_LIMIT);
  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": type },
      body: new Uint8Array(bytes),
    }).formData();
  } catch {
    throw new HttpError(400, "invalid_input", "Invalid multipart upload");
  }
  const file = form.get("file");
  const rawRevision = form.get("expectedRevision");
  if (
    !(file instanceof File) || typeof rawRevision !== "string" ||
    !/^[1-9]\d*$/.test(rawRevision)
  ) {
    throw new HttpError(
      400,
      "invalid_input",
      "Provide a PDF and expectedRevision",
    );
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new HttpError(413, "body_too_large", "PDF exceeds 25 MiB");
  }
  return { file, revision: requireRevision(Number(rawRevision)) };
}

export function createApp(
  config: Config,
  store: ObjectStore,
  options: { auth?: Auth; pageTransport?: PageTransport } = {},
): (request: Request) => Promise<Response> {
  const auth = options.auth ?? new Auth(config);
  const projects = new Projects(store);
  const authorize = async (request: Request, access: Access): Promise<void> => {
    await auth.authorize(request, access);
  };
  const route = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "GET" && path === "/healthz") {
      return json({ status: "ok" });
    }
    if (method === "GET" && path === "/manage/config.json") {
      return json({
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientId: config.spaClientId,
        scope: config.audience.startsWith("api://")
          ? `${config.audience}/${config.scope}`
          : `api://${config.audience}/${config.scope}`,
        redirectPath: "/manage/redirect",
      });
    }
    if (
      method === "GET" &&
      ["/manage/", "/manage", "/manage/redirect"].includes(path)
    ) {
      const nonce = crypto.randomUUID().replaceAll("-", "");
      const template = await Deno.readTextFile(
        new URL("../web/index.html", import.meta.url),
      );
      const page = template.replaceAll("__CSP_NONCE__", nonce);
      return new Response(
        path === "/manage/redirect"
          ? page.replace('src="/manage/app.js"', 'src="/manage/redirect.js"')
          : page,
        {
          headers: {
            ...baseHeaders,
            "content-type": "text/html; charset=utf-8",
            "content-security-policy":
              `default-src 'none'; script-src 'self' 'nonce-${nonce}'; ` +
              `style-src 'self' 'nonce-${nonce}'; connect-src 'self' ` +
              `https://login.microsoftonline.com; frame-src ` +
              `https://login.microsoftonline.com; img-src 'self' data:; ` +
              `form-action 'none'; base-uri 'none'; frame-ancestors 'none'`,
            "permissions-policy": "camera=(), microphone=()",
          },
        },
      );
    }
    if (
      method === "GET" &&
      ["/manage/app.js", "/manage/redirect.js"].includes(path)
    ) {
      const code = await Deno.readFile(
        new URL(
          path === "/manage/redirect.js"
            ? "../dist/redirect.js"
            : "../dist/app.js",
          import.meta.url,
        ),
      );
      return new Response(code, {
        headers: {
          ...baseHeaders,
          "content-type": "text/javascript; charset=utf-8",
        },
      });
    }
    if (method === "GET" && path === "/manage/styles.css") {
      const css = await Deno.readTextFile(
        new URL("../web/styles.css", import.meta.url),
      );
      return new Response(css, {
        headers: { ...baseHeaders, "content-type": "text/css; charset=utf-8" },
      });
    }
    if (method === "GET" && path === "/v1/auth-probe" && config.authProbe) {
      await authorize(request, "voice");
      return json({ authenticated: true, syntheticOnly: true });
    }
    if (method === "GET" && path === "/v1/state") {
      await authorize(request, "shared");
      return json(await projects.state());
    }
    if (path === "/v1/projects") {
      if (method === "GET") {
        await authorize(request, "shared");
        return json({ projects: await projects.list() });
      }
      if (method === "POST") {
        await authorize(request, "shared");
        const body = await bodyJson(request);
        return json(await projects.create(body.title), 201);
      }
    }
    if (
      method === "POST" &&
      ["/v1/projects/search", "/v1/patterns/search"].includes(path)
    ) {
      await authorize(request, "voice");
      await bodyJson(request);
      throw new HttpError(
        501,
        "ravelry_unavailable",
        "Ravelry read access has not been verified; use an uploaded PDF or public URL",
      );
    }
    const match = path.match(/^\/v1\/projects\/([^/]+)(?:\/(.*))?$/);
    if (match) {
      const [, id, operation = ""] = match;
      if (method === "GET" && !operation) {
        await authorize(request, "shared");
        return json(await projects.detail(id));
      }
      if (method === "POST" && operation === "select") {
        await authorize(request, "shared");
        return json(await projects.select(id));
      }
      if (method === "GET" && operation === "source-text") {
        await authorize(request, "voice");
        await projects.requireActive(id);
        return json(await projects.sourceText(id));
      }
      if (method === "POST" && operation === "source") {
        await authorize(request, "page");
        const { revision, file } = await uploadForm(request);
        await projects.requireAttachable(id, revision);
        const checked = await extractPdf(
          new Uint8Array(await file.arrayBuffer()),
          file.name,
        );
        return json(await projects.attach(id, revision, checked));
      }
      if (method === "POST" && operation === "source/url") {
        await authorize(request, "page");
        const body = await bodyJson(request);
        await projects.requireAttachable(id, body.expectedRevision);
        const checked = await fetchPage(body.url, options.pageTransport);
        return json(await projects.attach(id, body.expectedRevision, checked));
      }
      if (method === "POST" && operation === "source/ravelry") {
        await authorize(request, "voice");
        await projects.requireActive(id);
        await bodyJson(request);
        throw new HttpError(
          501,
          "ravelry_unavailable",
          "Purchased-pattern download is disabled until read access is verified",
        );
      }
      if (method === "POST" && operation === "progress") {
        await authorize(request, "voice");
        await projects.requireActive(id);
        const body = await bodyJson(request);
        return json(
          await projects.reportProgress(
            id,
            body.expectedRevision,
            body.location,
            body.report,
          ),
        );
      }
      if (method === "POST" && operation === "modifications") {
        await authorize(request, "voice");
        await projects.requireActive(id);
        const body = await bodyJson(request);
        return json(
          await projects.reportModification(id, body.expectedRevision, body),
        );
      }
      const followUp = operation.match(/^follow-ups\/([^/]+)\/complete$/);
      if (method === "POST" && followUp) {
        await authorize(request, "voice");
        await projects.requireActive(id);
        const body = await bodyJson(request);
        return json(
          await projects.applyFollowUp(
            id,
            followUp[1],
            body.expectedRevision,
            body.report,
          ),
        );
      }
      if (method === "POST" && operation === "complete") {
        await authorize(request, "voice");
        if ((await projects.detail(id)).status === "open") {
          await projects.requireActive(id);
        }
        const body = await bodyJson(request);
        return json(await projects.complete(id, body.expectedRevision));
      }
      if (method === "POST" && operation === "delete") {
        await authorize(request, "page");
        const body = await bodyJson(request);
        return json(
          await projects.delete(id, body.expectedRevision, body.confirmTitle),
        );
      }
    }
    throw new HttpError(404, "not_found", "Operation not found");
  };

  return async (request) => {
    try {
      return await route(request);
    } catch (error) {
      if (error instanceof HttpError) {
        return json(
          {
            error: {
              code: error.code,
              message: error.message,
              ...error.details,
            },
          },
          error.status,
        );
      }
      const requestId = crypto.randomUUID();
      console.error("assistant_error", { requestId, code: "internal_error" });
      return json({
        error: {
          code: "internal_error",
          message: "The service could not complete the request",
          requestId,
        },
      }, 500);
    }
  };
}
