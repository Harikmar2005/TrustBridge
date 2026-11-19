import crypto from "crypto";
import { env } from "../config/env";

export type NexconnAreaCode = "SG" | "NA" | "SA" | "BJ" | "OM";

export class NexconnNotConfiguredError extends Error {
  constructor(
    message = "Nexconn messaging service is not configured. Set NEXCONN_APP_KEY and NEXCONN_APP_SECRET on the backend."
  ) {
    super(message);
    this.name = "NexconnNotConfiguredError";
  }
}

export class NexconnUpstreamError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "NexconnUpstreamError";
    this.statusCode = statusCode;
  }
}

export interface NexconnRuntimeConfig {
  appKey: string;
  appSecret: string;
  areaCode: NexconnAreaCode;
  customApiBaseUrl?: string;
}

export interface NexconnTokenResult {
  token: string;
  nexconnUserId: string;
  appKey: string;
  areaCode: NexconnAreaCode;
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Deterministically maps a TrustBridge user ID to a Nexconn-compatible userId.
 * Nexconn Server API (/v4/auth/access-token/issue) supports alphanumeric characters
 * (uppercase/lowercase letters and numbers), max 64 bytes.
 */
export function toNexconnUserId(trustBridgeUserId: string): string {
  const trimmed = trustBridgeUserId.trim();
  if (!trimmed) {
    throw new Error("Cannot map empty TrustBridge user ID to Nexconn user ID.");
  }

  if (UUID_REGEX.test(trimmed)) {
    return `tb${trimmed.replace(/-/g, "").toLowerCase()}`;
  }

  const digest = crypto
    .createHash("sha256")
    .update(trimmed)
    .digest("hex")
    .slice(0, 32);
  return `tb${digest}`;
}

/**
 * Computes the Nexconn Server API request signature:
 * SHA1(AppSecret + Nonce + Timestamp) as lowercase hex.
 */
export function computeNexconnSignature(
  appSecret: string,
  nonce: string,
  timestamp: string
): string {
  return crypto
    .createHash("sha1")
    .update(`${appSecret}${nonce}${timestamp}`)
    .digest("hex");
}

export function buildNexconnRequestHeaders(params: {
  appKey: string;
  appSecret: string;
  nonce?: string;
  timestamp?: string;
  requestId?: string;
}): Record<string, string> {
  const nonce = params.nonce ?? crypto.randomBytes(8).toString("hex");
  const timestamp = params.timestamp ?? String(Date.now());
  const requestId = params.requestId ?? crypto.randomUUID();
  const signature = computeNexconnSignature(
    params.appSecret,
    nonce,
    timestamp
  );

  return {
    "App-Key": params.appKey,
    Nonce: nonce,
    Timestamp: timestamp,
    Signature: signature,
    "X-Request-ID": requestId,
    "Content-Type": "application/json",
  };
}

export function resolveNexconnApiDomains(
  areaCode: NexconnAreaCode,
  customBaseUrl?: string
): string[] {
  const override = customBaseUrl?.trim().replace(/\/+$/, "");
  if (override) {
    return [override];
  }

  switch (areaCode) {
    case "NA":
      return [
        "https://api.us-light-api.com",
        "https://api-b.us-light-api.com",
      ];
    case "SA":
      return [
        "https://api.sau-light-api.com",
        "https://api-b.sau-light-api.com",
      ];
    case "SG":
    case "BJ":
    case "OM":
    default:
      return [
        "https://api.sg-light-api.com",
        "https://api-b.sg-light-api.com",
      ];
  }
}

export function getNexconnRuntimeConfig(): NexconnRuntimeConfig {
  return {
    appKey: env.NEXCONN_APP_KEY.trim(),
    appSecret: env.NEXCONN_APP_SECRET.trim(),
    areaCode: env.NEXCONN_AREA_CODE,
    customApiBaseUrl: env.NEXCONN_API_BASE_URL.trim() || undefined,
  };
}

export function isNexconnConfigured(
  config: NexconnRuntimeConfig = getNexconnRuntimeConfig()
): boolean {
  return Boolean(config.appKey && config.appSecret);
}

export type FetchLike = typeof fetch;

export async function issueNexconnUserToken(
  input: {
    trustBridgeUserId: string;
    fullName: string;
  },
  options?: {
    config?: NexconnRuntimeConfig;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
  }
): Promise<NexconnTokenResult> {
  const config = options?.config ?? getNexconnRuntimeConfig();
  if (!isNexconnConfigured(config)) {
    throw new NexconnNotConfiguredError();
  }

  const nexconnUserId = toNexconnUserId(input.trustBridgeUserId);
  const safeName =
    input.fullName.trim().slice(0, 64) || "TrustBridge User";
  const domains = resolveNexconnApiDomains(
    config.areaCode,
    config.customApiBaseUrl
  );
  const fetchFn = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 5000;

  let lastError: Error | null = null;

  for (const baseUrl of domains) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = buildNexconnRequestHeaders({
        appKey: config.appKey,
        appSecret: config.appSecret,
      });

      const response = await fetchFn(
        `${baseUrl}/v4/auth/access-token/issue`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            userId: nexconnUserId,
            name: safeName,
          }),
          signal: controller.signal,
        }
      );

      let payload: Record<string, unknown> | null = null;
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const upstreamMsg =
          typeof payload?.msg === "string"
            ? payload.msg
            : typeof payload?.message === "string"
              ? payload.message
              : `HTTP ${response.status}`;

        // Do not retry client auth/signature rejections on backup domain
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          throw new NexconnUpstreamError(
            `Nexconn token issuance rejected (${upstreamMsg}).`,
            502
          );
        }

        lastError = new NexconnUpstreamError(
          `Nexconn token endpoint error (${upstreamMsg}).`,
          502
        );
        continue;
      }

      const code = Number(payload?.code);
      const resultObj =
        payload?.result && typeof payload.result === "object"
          ? (payload.result as Record<string, unknown>)
          : null;
      const accessToken =
        typeof resultObj?.accessToken === "string"
          ? resultObj.accessToken
          : typeof payload?.token === "string"
            ? payload.token
            : "";

      if ((code === 0 || code === 200) && accessToken) {
        return {
          token: accessToken,
          nexconnUserId,
          appKey: config.appKey,
          areaCode: config.areaCode,
        };
      }

      const errMsg =
        typeof payload?.msg === "string"
          ? payload.msg
          : `Unexpected Nexconn response code (${String(payload?.code)})`;
      throw new NexconnUpstreamError(
        `Nexconn token issuance failed: ${errMsg}`,
        502
      );
    } catch (error) {
      if (error instanceof NexconnUpstreamError) {
        throw error;
      }
      lastError =
        error instanceof Error
          ? new NexconnUpstreamError(
              `Unable to reach Nexconn token service (${error.name}).`,
              502
            )
          : new NexconnUpstreamError("Unable to reach Nexconn token service.", 502);
    } finally {
      clearTimeout(timer);
    }
  }

  throw (
    lastError ??
    new NexconnUpstreamError("Unable to issue Nexconn user token.", 502)
  );
}
