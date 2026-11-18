import { createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Config } from "./config.ts";
import { HttpError } from "./errors.ts";

export type Access = "voice" | "page" | "shared";
export type Actor = "voice" | "page";

function equalToken(candidate: string, known: string): boolean {
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(known).digest();
  return timingSafeEqual(a, b);
}

export class Auth {
  private readonly keys: JWTVerifyGetKey;

  constructor(
    private readonly config: Config,
    keys?: JWTVerifyGetKey,
  ) {
    this.keys = keys ?? createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`,
      ),
    );
  }

  async authorize(request: Request, access: Access): Promise<Actor> {
    const header = request.headers.get("authorization");
    const match = header?.match(/^Bearer ([^\s]+)$/i);
    if (!match) {
      throw new HttpError(401, "unauthorized", "A bearer token is required");
    }

    const token = match[1];
    if (
      equalToken(token, this.config.token) ||
      (this.config.previousToken &&
        equalToken(token, this.config.previousToken))
    ) {
      if (access === "page") {
        throw new HttpError(
          403,
          "wrong_caller",
          "This operation requires user sign-in",
        );
      }
      return "voice";
    }
    if (token.split(".").length !== 3) {
      throw new HttpError(401, "unauthorized", "Invalid bearer token");
    }

    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.keys, {
        issuer:
          `https://login.microsoftonline.com/${this.config.tenantId}/v2.0`,
        audience: this.config.audience,
        algorithms: ["RS256"],
        clockTolerance: 5,
      }));
    } catch {
      throw new HttpError(401, "unauthorized", "Invalid Entra access token");
    }
    if (typeof payload.exp !== "number" || payload.ver !== "2.0") {
      throw new HttpError(
        401,
        "unauthorized",
        "An expiring v2 access token is required",
      );
    }
    if (
      payload.tid !== this.config.tenantId ||
      payload.oid !== this.config.ownerOid ||
      typeof payload.scp !== "string" ||
      !payload.scp.split(" ").includes(this.config.scope)
    ) {
      throw new HttpError(
        403,
        "forbidden",
        "The token does not authorize this user or scope",
      );
    }
    if (access === "voice") {
      throw new HttpError(
        403,
        "wrong_caller",
        "This operation requires the agent token",
      );
    }
    return "page";
  }
}
