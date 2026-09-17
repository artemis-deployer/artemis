import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as statusGET } from "../app/api/status/route";
import { POST as chatPOST } from "../app/api/chat/route";

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

  it("rejects malformed message items with 400", async () => {
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user" }, null, "hi"] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
  });

  it("proxies to upstream and returns reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "hi {\"ticker\":\"X\"}" } }] }),
    }));
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { reply: string }).reply).toContain("hi");
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
});
