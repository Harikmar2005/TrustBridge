import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildNexconnRequestHeaders,
  computeNexconnSignature,
  isNexconnConfigured,
  issueNexconnUserToken,
  NexconnNotConfiguredError,
  NexconnUpstreamError,
  resolveNexconnApiDomains,
  toNexconnUserId,
} from "./nexconn.service";

describe("Nexconn Server Token Service", () => {
  it("maps TrustBridge UUIDs deterministically to alphanumeric Nexconn userIds <= 64 chars", () => {
    const uuidA = "550e8400-e29b-41d4-a716-446655440000";
    const uuidB = "550e8400-e29b-41d4-a716-446655440001";

    const mappedA1 = toNexconnUserId(uuidA);
    const mappedA2 = toNexconnUserId(uuidA);
    const mappedB = toNexconnUserId(uuidB);

    assert.equal(mappedA1, mappedA2);
    assert.notEqual(mappedA1, mappedB);
    assert.match(mappedA1, /^[a-zA-Z0-9]+$/);
    assert.ok(mappedA1.length <= 64);

    // Non-UUID IDs also map deterministically to safe alphanumeric strings
    const customMapped = toNexconnUserId("legacy_user-with-symbols@1");
    assert.match(customMapped, /^[a-zA-Z0-9]+$/);
    assert.ok(customMapped.length <= 64);
  });

  it("computes SHA-1 signature as sha1(appSecret + nonce + timestamp)", () => {
    const sig = computeNexconnSignature("secret123", "98765", "1700000000000");
    assert.equal(sig.length, 40);
    assert.equal(
      sig,
      computeNexconnSignature("secret123", "98765", "1700000000000")
    );
    assert.notEqual(
      sig,
      computeNexconnSignature("otherSecret", "98765", "1700000000000")
    );

    const headers = buildNexconnRequestHeaders({
      appKey: "app-key-demo",
      appSecret: "secret123",
      nonce: "98765",
      timestamp: "1700000000000",
      requestId: "req-1",
    });
    assert.equal(headers["App-Key"], "app-key-demo");
    assert.equal(headers.Nonce, "98765");
    assert.equal(headers.Timestamp, "1700000000000");
    assert.equal(headers.Signature, sig);
    assert.equal(headers["X-Request-ID"], "req-1");
  });

  it("resolves primary and backup Nexconn API domains by areaCode", () => {
    assert.deepEqual(resolveNexconnApiDomains("SG"), [
      "https://api.sg-light-api.com",
      "https://api-b.sg-light-api.com",
    ]);
    assert.deepEqual(resolveNexconnApiDomains("NA"), [
      "https://api.us-light-api.com",
      "https://api-b.us-light-api.com",
    ]);
    assert.deepEqual(resolveNexconnApiDomains("SA"), [
      "https://api.sau-light-api.com",
      "https://api-b.sau-light-api.com",
    ]);
    assert.deepEqual(
      resolveNexconnApiDomains("SG", "https://custom.example.test/"),
      ["https://custom.example.test"]
    );
  });

  it("throws NexconnNotConfiguredError when credentials are missing", async () => {
    const cfg = { appKey: "", appSecret: "", areaCode: "SG" as const };
    assert.equal(isNexconnConfigured(cfg), false);

    await assert.rejects(
      () =>
        issueNexconnUserToken(
          {
            trustBridgeUserId: "550e8400-e29b-41d4-a716-446655440000",
            fullName: "Alice Buyer",
          },
          { config: cfg }
        ),
      NexconnNotConfiguredError
    );
  });

  it("issues a token via POST /v4/auth/access-token/issue and fails over to backup domain on 5xx", async () => {
    const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: String(init?.body ?? ""),
      });

      if (String(url).startsWith("https://api.sg-light-api.com")) {
        return new Response(JSON.stringify({ msg: "Gateway timeout" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          code: 0,
          result: {
            userId: "tb550e8400e29b41d4a716446655440000",
            accessToken: "mock-nexconn-access-token",
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }) as typeof fetch;

    const result = await issueNexconnUserToken(
      {
        trustBridgeUserId: "550e8400-e29b-41d4-a716-446655440000",
        fullName: "Alice Buyer",
      },
      {
        config: {
          appKey: "public-app-key",
          appSecret: "super-secret-value-never-returned",
          areaCode: "SG",
        },
        fetchImpl: mockFetch,
      }
    );

    assert.equal(calls.length, 2);
    assert.equal(
      calls[0].url,
      "https://api.sg-light-api.com/v4/auth/access-token/issue"
    );
    assert.equal(
      calls[1].url,
      "https://api-b.sg-light-api.com/v4/auth/access-token/issue"
    );
    assert.equal(calls[1].headers["App-Key"], "public-app-key");
    assert.ok(calls[1].headers.Signature);
    assert.deepEqual(JSON.parse(calls[1].body), {
      userId: "tb550e8400e29b41d4a716446655440000",
      name: "Alice Buyer",
    });

    assert.equal(result.token, "mock-nexconn-access-token");
    assert.equal(result.nexconnUserId, "tb550e8400e29b41d4a716446655440000");
    assert.equal(result.appKey, "public-app-key");
    assert.equal(result.areaCode, "SG");
    assert.equal(
      JSON.stringify(result).includes("super-secret-value-never-returned"),
      false
    );
  });

  it("rejects immediately on 401 signature failure without leaking appSecret", async () => {
    let callCount = 0;
    const mockFetch = (async () => {
      callCount++;
      return new Response(JSON.stringify({ msg: "Invalid signature" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    await assert.rejects(
      () =>
        issueNexconnUserToken(
          {
            trustBridgeUserId: "550e8400-e29b-41d4-a716-446655440000",
            fullName: "Alice Buyer",
          },
          {
            config: {
              appKey: "public-app-key",
              appSecret: "top-secret-app-secret",
              areaCode: "SG",
            },
            fetchImpl: mockFetch,
          }
        ),
      (err: unknown) => {
        assert.ok(err instanceof NexconnUpstreamError);
        assert.equal(err.message.includes("top-secret-app-secret"), false);
        return true;
      }
    );

    assert.equal(callCount, 1);
  });
});
