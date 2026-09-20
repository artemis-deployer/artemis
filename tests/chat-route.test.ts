import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as statusGET } from "../app/api/status/route";
import { POST as chatPOST, SYSTEM_PROMPT } from "../app/api/chat/route";
import { clearRateLimits } from "../lib/rate-limit";

describe("status route", () => {
  it("reports unconfigured when env is missing", async () => {
    vi.stubEnv("LLM_API_URL", "");
    vi.stubEnv("LLM_API_KEY", "");
    const res = await statusGET();
    const json = (await res.json()) as { configured: boolean; networks: unknown[] };
    expect(json.configured).toBe(false);
    expect(json.networks.length).toBe(4);
  });
});

describe("chat route", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.unstubAllGlobals();
    vi.stubEnv("LLM_API_URL", "https://example.test/v1/chat/completions");
    vi.stubEnv("LLM_API_KEY", "secret");
  });

  it("returns 502 chat_offline when unconfigured", async () => {
    vi.stubEnv("LLM_API_URL", "");
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("chat_offline");
  });

  it("rejects empty messages with 400", async () => {
    const req = new Request("http://x/api/chat", { method: "POST", body: JSON.stringify({ messages: [] }) });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
  });

  it("rejects null and non-object JSON with 400", async () => {
    for (const raw of ["null", "[]", '"hi"', "5"]) {
      const req = new Request("http://x/api/chat", { method: "POST", body: raw });
      const res = await chatPOST(req);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe("bad_request");
    }
  });

  it("rejects malformed message items with 400", async () => {
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user" }, null, "hi"] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
  });

  it("uses strict output contract in system prompt", () => {
    expect(SYSTEM_PROMPT).toContain("80");
    expect(SYSTEM_PROMPT).toContain("```json");
    expect(SYSTEM_PROMPT).toContain("LAST");
    expect(SYSTEM_PROMPT).toContain("ONE");
    expect(SYSTEM_PROMPT).toContain("ticker");
    expect(SYSTEM_PROMPT).toContain("uppercase");
    expect(SYSTEM_PROMPT).toContain("12");
    expect(SYSTEM_PROMPT).toContain("pooled");
    expect(SYSTEM_PROMPT).toContain("liquidity");
    expect(SYSTEM_PROMPT).toContain("direct");
    expect(SYSTEM_PROMPT).toContain("pumpfun");
    expect(SYSTEM_PROMPT).toContain("999000000");
    expect(SYSTEM_PROMPT).toContain("1000000000");
    expect(SYSTEM_PROMPT).toContain("private keys");
    expect(SYSTEM_PROMPT).toContain("sign transactions");
    expect(SYSTEM_PROMPT).toContain("User:");
    expect(SYSTEM_PROMPT).toContain("digits");
    expect(SYSTEM_PROMPT).toContain("chainId");
    expect(SYSTEM_PROMPT).toContain("sensible defaults");
  });

  it("retries once and applies the corrected draft", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Meme coin!\n```json\n{"name":"Prabowo Meme Coin","ticker":"PROBO","pooled":"1 SOL","liquidity":"locked","route":"SOL-USDC"}\n```',
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Fixed!\n```json\n{"name":"Prabowo Meme Coin","ticker":"PROBO","pooled":"799200000","liquidity":"0.5","route":"direct","chainId":46630}\n```',
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "prabowo meme" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      draft: { ticker: string; pooled: string; chainId: number } | null;
      draftErrors: string[];
    };
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(json.draft).toMatchObject({ ticker: "PROBO", pooled: "799200000", chainId: 46630 });
    expect(json.draftErrors).toEqual([]);
  });

  it("calls upstream once when first reply is valid (no loop, max 2)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'Nice!\n```json\n{"name":"Arts Club","ticker":"ARTS","pooled":"500000","liquidity":"1.5","route":"direct"}\n```',
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns first-reply errors when retry also fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Nope\n```json\n{\"ticker\":\n```" } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await chatPOST(req);
    const json = (await res.json()) as { draft: unknown; draftErrors: string[] };
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(json.draft).toBeNull();
    expect(json.draftErrors.length).toBeGreaterThan(0);
  });

  it("sends low temperature and token cap upstream", async () => {
    let sentBody: { temperature?: number; max_tokens?: number } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, init: { body?: string }) => {
        sentBody = JSON.parse(init.body ?? "{}") as { temperature?: number; max_tokens?: number };
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content:
                    'Nice idea!\n```json\n{"name":"Arts Club","ticker":"ARTS","pooled":"500000","liquidity":"1.5","route":"direct"}\n```',
                },
              },
            ],
          }),
        };
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    await chatPOST(req);
    expect(sentBody.temperature).toBe(0.2);
    expect(sentBody.max_tokens).toBe(500);
  });

  it("proxies to upstream and returns reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "hi {\"ticker\":\"X\"}" } }] }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { reply: string }).reply).toContain("hi");
  });

  it("extracts draft from last fenced block", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: [
                  "Short take here.",
                  "```json",
                  '{"name":"Old","ticker":"OLD","pooled":"1","liquidity":"1","route":"direct"}',
                  "```",
                  "Refined pick:",
                  "```json",
                  '{"name":"Arts Club","ticker":"ARTS","pooled":"500000","liquidity":"1.5","route":"direct"}',
                  "```",
                ].join("\n"),
              },
            },
          ],
        }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      reply: string;
      draft: { ticker: string; route: string } | null;
      draftErrors: string[];
    };
    expect(json.draft).toMatchObject({ ticker: "ARTS", route: "direct" });
    expect(json.draftErrors).toEqual([]);
  });

  it("returns draft null with errors on invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Almost!\n```json\n{\"ticker\":\n```" } }],
        }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { draft: unknown; draftErrors: string[] };
    expect(json.draft).toBeNull();
    expect(json.draftErrors.length).toBeGreaterThan(0);
  });

  it("returns draft null with errors on invalid draft values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Bad values\n```json\n{"name":"X","ticker":"bad-ticker!!","pooled":"-5","liquidity":"abc","route":"nope"}\n```',
              },
            },
          ],
        }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    const json = (await res.json()) as { draft: unknown; draftErrors: string[] };
    expect(json.draft).toBeNull();
    expect(json.draftErrors.length).toBeGreaterThan(0);
  });

  it("maps upstream failure to 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(502);
  });

  it("maps network failure to 502 chat_offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("chat_offline");
  });

  it("preserves offline behavior with no draft field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string; draft?: unknown };
    expect(json.error).toBe("chat_offline");
    expect(json.draft).toBeUndefined();
  });

  it("throttles after 11 rapid posts with 429", async () => {
    clearRateLimits();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Nice!\n```json\n{"name":"Arts Club","ticker":"ARTS","pooled":"500000000","liquidity":"1.5","route":"direct"}\n```',
              },
            },
          ],
        }),
      }),
    );
    const makeReq = () =>
      new Request("http://x/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
      });
    for (let i = 0; i < 10; i++) {
      const res = await chatPOST(makeReq());
      expect(res.status).toBe(200);
    }
    const limited = await chatPOST(makeReq());
    expect(limited.status).toBe(429);
    expect(((await limited.json()) as { error: string }).error).toBe("too_many_requests");
  });

  it("rejects hex numerics like 0x10", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Hex!\n```json\n{"name":"Hex","ticker":"HEX","pooled":"0x10","liquidity":"1.5","route":"direct"}\n```',
              },
            },
          ],
        }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    const json = (await res.json()) as { draft: unknown; draftErrors: string[] };
    expect(json.draft).toBeNull();
    expect(json.draftErrors).toContain("invalid-pooled");
  });

  it("rejects exponent numerics like 1e6", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Exp!\n```json\n{"name":"Exp","ticker":"EXP","pooled":"1e6","liquidity":"1.5","route":"direct"}\n```',
              },
            },
          ],
        }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    const json = (await res.json()) as { draft: unknown; draftErrors: string[] };
    expect(json.draft).toBeNull();
    expect(json.draftErrors).toContain("invalid-pooled");
  });

  it("keeps few-shot example prose and JSON consistent", () => {
    expect(SYSTEM_PROMPT).toContain("500000000 pooled");
    expect(SYSTEM_PROMPT).toContain('"pooled":"500000000"');
  });

  it("instructs incremental revision with full draft JSON and chain inference", () => {
    expect(SYSTEM_PROMPT).toContain("Current draft");
    expect(SYSTEM_PROMPT).toMatch(/incremental/i);
    expect(SYSTEM_PROMPT).toContain("FULL");
    expect(SYSTEM_PROMPT).toContain("Solana");
    expect(SYSTEM_PROMPT).toContain("Robinhood");
    expect(SYSTEM_PROMPT).toContain("current chain");
  });

  it("injects current draft into upstream system context", async () => {
    let sentBody: { messages?: { role: string; content: string }[] } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, init: { body?: string }) => {
        sentBody = JSON.parse(init.body ?? "{}") as typeof sentBody;
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content:
                    'Nice!\n```json\n{"name":"Arts Club","ticker":"ARTS","pooled":"500000000","liquidity":"1.5","route":"direct"}\n```',
                },
              },
            ],
          }),
        };
      }),
    );
    const draft = { ticker: "OLD", pooled: "1", liquidity: "1", route: "direct", chainId: 46630 };
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "bump liquidity" }], draft }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    const system = sentBody.messages?.[0]?.content ?? "";
    expect(system).toContain("Current draft");
    expect(system).toContain("OLD");
  });

  it("accepts valid chainId in server draft", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Pick!\n```json\n{"name":"X","ticker":"X","pooled":"100","liquidity":"1","route":"direct","chainId":4663}\n```',
              },
            },
          ],
        }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "evm coin" }] }),
    });
    const res = await chatPOST(req);
    const json = (await res.json()) as { draft: { chainId?: unknown } | null };
    expect(json.draft).toMatchObject({ chainId: 4663 });
  });

  it("ignores unknown top-level and message fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Nice!\n```json\n{"name":"Arts Club","ticker":"ARTS","pooled":"500000","liquidity":"1.5","route":"direct"}\n```',
              },
            },
          ],
        }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "make a coin", evil: 1 }],
        draft: { ticker: "X" },
        foo: "bar",
        evilTop: 123,
      }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { draft: { ticker?: string } | null };
    expect(json.draft).toMatchObject({ ticker: "ARTS" });
  });

  it("survives 5MB JSON without crash (400, not 500)", async () => {
    const big = "x".repeat(5 * 1024 * 1024);
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: big }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
  });

  it("maps empty body and broken JSON syntax to 400", async () => {
    for (const raw of ["", "{bad", '{"messages":}']) {
      const req = new Request("http://x/api/chat", { method: "POST", body: raw });
      const res = await chatPOST(req);
      expect(res.status).toBe(400);
    }
  });

  it("drops unknown chainId from server draft", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Pick!\n```json\n{"name":"X","ticker":"X","pooled":"100","liquidity":"1","route":"direct","chainId":999999}\n```',
              },
            },
          ],
        }),
      }),
    );
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "weird chain" }] }),
    });
    const res = await chatPOST(req);
    const json = (await res.json()) as { draft: Record<string, unknown> | null; draftErrors: string[] };
    expect(json.draftErrors).toEqual([]);
    expect(json.draft).not.toHaveProperty("chainId");
  });
});
