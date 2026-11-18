import { lookup } from "node:dns/promises";
import { request as httpsRequest, type RequestOptions } from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { DOMParser } from "linkedom";
import {
  getDocument,
  GlobalWorkerOptions,
  OPS,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { HttpError, requireText } from "./errors.ts";
import type { CheckedSource } from "./projects.ts";

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_CHARS = 100_000;

GlobalWorkerOptions.workerSrc = import.meta.resolve(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
);

export async function extractPdf(
  bytes: Uint8Array,
  filename: unknown,
): Promise<CheckedSource> {
  const label = requireText(filename, "filename", 200);
  if (
    bytes.length > MAX_PDF_BYTES || bytes.length < 8 ||
    new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-"
  ) {
    throw new HttpError(
      bytes.length > MAX_PDF_BYTES ? 413 : 415,
      "invalid_pdf",
      "Upload a PDF no larger than 25 MiB",
    );
  }
  if (/[\\/\r\n]/.test(label)) {
    throw new HttpError(
      400,
      "invalid_input",
      "Filename must not contain a path",
    );
  }

  let task: ReturnType<typeof getDocument> | undefined;
  try {
    const options = {
      data: bytes.slice(),
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
      stopAtErrors: true,
    };
    task = getDocument(options);
    const document = await task.promise;
    if (document.numPages < 1 || document.numPages > 60) {
      throw new HttpError(
        422,
        "unusable_source",
        "PDF must have 1-60 readable pages",
      );
    }
    const pages: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const operators = await page.getOperatorList();
      if (
        operators.fnArray.some((op) =>
          [
            OPS.paintImageXObject,
            OPS.paintInlineImageXObject,
            OPS.paintImageMaskXObject,
            OPS.constructPath,
          ].includes(op)
        )
      ) {
        throw new HttpError(
          422,
          "unusable_source",
          "PDF contains images or drawings; text-only extraction cannot verify charts or diagrams",
        );
      }
      const content = await page.getTextContent();
      const items = content.items.filter(
        (
          item,
        ): item is typeof item & {
          str: string;
          transform: number[];
          width: number;
        } => "str" in item && "transform" in item && "width" in item,
      );
      items.sort((a, b) => {
        const row = b.transform[5] - a.transform[5];
        return Math.abs(row) > 2 ? row : a.transform[4] - b.transform[4];
      });
      for (let index = 1; index < items.length; index++) {
        const previous = items[index - 1];
        const current = items[index];
        if (
          Math.abs(previous.transform[5] - current.transform[5]) <= 2 &&
          current.transform[4] - (previous.transform[4] + previous.width) > 100
        ) {
          throw new HttpError(
            422,
            "unusable_source",
            "PDF has separated text columns; reading order cannot be verified",
          );
        }
      }
      let text = "";
      let previousY: number | undefined;
      for (const item of items) {
        if (previousY !== undefined) {
          text += Math.abs(previousY - item.transform[5]) > 2 ? "\n" : " ";
        }
        text += item.str;
        previousY = item.transform[5];
      }
      if (text.trim().length < 40) {
        throw new HttpError(
          422,
          "unusable_source",
          `PDF page ${number} has too little extractable text to verify`,
        );
      }
      pages.push(`Page ${number}\n${text.trim()}`);
      if (pages.join("\n\n").length > MAX_SOURCE_CHARS) {
        throw new HttpError(
          422,
          "unusable_source",
          "PDF text exceeds the trial context limit",
        );
      }
    }
    return { kind: "pdf", label, text: pages.join("\n\n"), pdf: bytes };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      422,
      "unusable_source",
      "PDF text could not be extracted completely",
    );
  } finally {
    await task?.destroy();
  }
}

export interface Address {
  address: string;
  family: 4 | 6;
}

export interface PageResponse {
  status: number;
  contentType: string;
  contentEncoding?: string;
  bytes: Uint8Array;
}

export interface PageTransport {
  resolve(hostname: string): Promise<Address[]>;
  download(url: URL, address: Address): Promise<PageResponse>;
}

export function parsePublicUrl(raw: unknown): URL {
  if (
    typeof raw !== "string" || raw.length > 2048 || raw !== raw.trim() ||
    !raw.startsWith("https://") || /[\\#]/.test(raw) ||
    [...raw].some((char) => char.charCodeAt(0) <= 32)
  ) {
    throw new HttpError(400, "unsafe_url", "Enter a public HTTPS page URL");
  }
  const authority = raw.slice("https://".length).split(/[/?]/, 1)[0];
  if (
    authority.includes("@") || authority.includes("%") || (
      authority.includes(":") && !authority.endsWith(":443")
    )
  ) {
    throw new HttpError(400, "unsafe_url", "URL authority is not allowed");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "unsafe_url", "Enter a valid HTTPS page URL");
  }
  const hostname = url.hostname;
  const labels = hostname.split(".");
  if (
    url.protocol !== "https:" || url.port || url.username || url.password ||
    isIP(hostname) !== 0 || labels.length < 2 ||
    labels.some((label) =>
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
    ) ||
    !/^[a-z]{2,63}$/i.test(labels.at(-1) ?? "") ||
    ["local", "localhost", "internal", "test", "invalid", "example", "onion"]
      .includes(
        labels.at(-1)?.toLowerCase() ?? "",
      )
  ) {
    throw new HttpError(
      400,
      "unsafe_url",
      "Enter a public HTTPS DNS hostname on port 443",
    );
  }
  return url;
}

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address);
    if (parsed.range() !== "unicast") return false;
    if (parsed.kind() === "ipv4") {
      const ipv4 = parsed as ipaddr.IPv4;
      return ![
        ["192.0.0.0", 24],
        ["192.88.99.0", 24],
      ].some(([subnet, mask]) =>
        ipv4.match(ipaddr.parse(subnet as string), mask as number)
      );
    }
    const ipv6 = parsed as ipaddr.IPv6;
    return ipv6.match(ipaddr.parse("2000::"), 3) &&
      !ipv6.match(ipaddr.parse("2001::"), 23) &&
      !ipv6.match(ipaddr.parse("3fff::"), 20);
  } catch {
    return false;
  }
}

export function pinnedRequestOptions(
  url: URL,
  address: Address,
): RequestOptions {
  return {
    method: "GET",
    agent: false,
    servername: url.hostname,
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
    maxHeaderSize: 16 * 1024,
    headers: {
      accept: "text/html",
      "accept-encoding": "identity",
      "user-agent": "PersonalAssistant/0.1 (public page import)",
    },
    lookup(hostname, options, callback) {
      if (hostname.toLowerCase() !== url.hostname.toLowerCase()) {
        callback(new Error("Unexpected destination"), "");
        return;
      }
      if (typeof options === "object" && options.all) {
        callback(null, [address]);
      } else {
        callback(null, address.address, address.family);
      }
    },
  };
}

async function download(url: URL, address: Address): Promise<PageResponse> {
  return await new Promise<PageResponse>((resolve, reject) => {
    let verifiedPeer = false;
    const request = httpsRequest(
      url,
      {
        ...pinnedRequestOptions(url, address),
        signal: AbortSignal.timeout(12_000),
      },
      (response) => {
        if (!verifiedPeer) {
          reject(
            new HttpError(
              502,
              "upstream_error",
              "Webpage connection was not verified",
            ),
          );
          request.destroy();
          return;
        }
        const chunks: Uint8Array[] = [];
        let length = 0;
        response.on("data", (chunk: Uint8Array) => {
          length += chunk.length;
          if (length > MAX_HTML_BYTES) {
            reject(
              new HttpError(413, "page_too_large", "Webpage exceeds 2 MiB"),
            );
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          if (!response.complete) {
            reject(
              new HttpError(
                502,
                "upstream_error",
                "Webpage response was incomplete",
              ),
            );
            return;
          }
          const bytes = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          resolve({
            status: response.statusCode ?? 502,
            contentType: String(response.headers["content-type"] ?? ""),
            contentEncoding: String(response.headers["content-encoding"] ?? ""),
            bytes,
          });
        });
        response.on("error", () => {
          reject(
            new HttpError(502, "upstream_error", "Webpage response failed"),
          );
        });
      },
    );
    request.on("socket", (socket) => {
      socket.once("secureConnect", () => {
        if (
          socket.remoteAddress !== address.address ||
          !("authorized" in socket) || socket.authorized !== true
        ) {
          reject(
            new HttpError(
              502,
              "upstream_error",
              "Webpage destination or TLS check failed",
            ),
          );
          request.destroy();
        } else {
          verifiedPeer = true;
        }
      });
    });
    request.on("error", () => {
      reject(
        new HttpError(502, "upstream_error", "Could not fetch the webpage"),
      );
    });
    request.end();
  });
}

const defaultTransport: PageTransport = {
  async resolve(hostname) {
    return await lookup(hostname, { all: true, verbatim: true }) as Address[];
  },
  download,
};

function readableText(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  if (!document.body || document.querySelector('input[type="password"]')) {
    throw new HttpError(
      422,
      "unusable_source",
      "Page requires sign-in or has no readable body",
    );
  }
  for (
    const node of document.querySelectorAll(
      "script, style, noscript, nav, header, footer, form, aside, svg, iframe",
    )
  ) {
    node.remove();
  }
  for (const node of document.querySelectorAll("br")) node.replaceWith("\n");
  for (
    const node of document.querySelectorAll(
      "p, div, li, h1, h2, h3, h4, h5, h6, section, article, main, tr, table",
    )
  ) {
    node.before("\n");
    node.after("\n");
  }
  for (const node of document.querySelectorAll("td, th")) node.after(" | ");
  for (const node of document.querySelectorAll("img[alt]")) {
    node.replaceWith(node.getAttribute("alt") ?? "");
  }
  const text = document.body.textContent
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  if (
    text.length < 120 || text.length > MAX_SOURCE_CHARS ||
    (/enable javascript|sign in to (view|see|continue)|log in to (view|see|continue)/i
      .test(text) && text.length < 500)
  ) {
    throw new HttpError(
      422,
      "unusable_source",
      "Webpage has no complete readable text",
    );
  }
  return text;
}

export async function fetchPage(
  raw: unknown,
  transport: PageTransport = defaultTransport,
): Promise<CheckedSource> {
  const url = parsePublicUrl(raw);
  let addresses: Address[];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    addresses = await Promise.race([
      transport.resolve(url.hostname),
      new Promise<never>((_, reject) =>
        timer = setTimeout(() => reject(new Error("DNS timeout")), 6000)
      ),
    ]);
  } catch {
    throw new HttpError(
      502,
      "dns_failed",
      "Public hostname could not be resolved",
    );
  } finally {
    clearTimeout(timer);
  }
  if (
    addresses.length === 0 || addresses.length > 32 ||
    addresses.some(({ address, family }) =>
      ![4, 6].includes(family) || isIP(address) !== family ||
      !isPublicAddress(address)
    )
  ) {
    throw new HttpError(
      400,
      "unsafe_destination",
      "URL does not resolve only to public IPs",
    );
  }
  const address = addresses.find(({ family }) => family === 4) ?? addresses[0];
  const response = await transport.download(url, address);
  if (response.status >= 300 && response.status < 400) {
    throw new HttpError(
      422,
      "redirect_not_allowed",
      "Redirecting webpages are not supported",
    );
  }
  if (response.status !== 200) {
    throw new HttpError(
      502,
      "upstream_error",
      "Webpage did not return HTTP 200",
    );
  }
  if (
    !/^text\/html(?:\s*;|$)/i.test(response.contentType) ||
    (response.contentEncoding &&
      response.contentEncoding.toLowerCase() !== "identity")
  ) {
    throw new HttpError(
      415,
      "unsupported_page",
      "Expected an uncompressed HTML webpage",
    );
  }
  if (response.bytes.length > MAX_HTML_BYTES) {
    throw new HttpError(413, "page_too_large", "Webpage exceeds 2 MiB");
  }
  if (
    /;\s*charset\s*=\s*(?!utf-8\b)/i.test(response.contentType)
  ) {
    throw new HttpError(
      422,
      "unusable_source",
      "Webpage must be UTF-8 encoded",
    );
  }
  let html: string;
  try {
    html = new TextDecoder("utf-8", { fatal: true }).decode(response.bytes);
  } catch {
    throw new HttpError(
      422,
      "unusable_source",
      "Webpage text cannot be decoded",
    );
  }
  return {
    kind: "web",
    label: url.hostname,
    url: url.href,
    text: readableText(html),
  };
}
