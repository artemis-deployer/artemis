import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/logo/route";

const B64 = Buffer.from("fakepngbytes").toString("base64");

function googleOk() {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: B64 } }] } }],
    }),
  };
}

describe("POST /api/logo", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it("returns 502 logo_offline without a key (client falls back)", async () => {
    vi.stubEnv("GOOGLE_API_KEY", "");
    const res = await POST(
      new Request("http://x/api/logo", { method: "POST", body: JSON.stringify({ logoPrompt: "A brass owl" }) }),
    );
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("logo_offline");
  });

  it("rejects empty prompt with 400", async () => {
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
    const res = await POST(
      new Request("http://x/api/logo", { method: "POST", body: JSON.stringify({ logoPrompt: "" }) }),
    );
    expect(res.status).toBe(400);
  });

  it("returns imageData on Google success", async () => {
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(googleOk()));
    const res = await POST(
      new Request("http://x/api/logo", { method: "POST", body: JSON.stringify({ logoPrompt: "A brass owl" }) }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { imageData: string; mimeType: string; ext: string };
    expect(json.imageData.startsWith("data:image/png;base64,")).toBe(true);
    expect(json.ext).toBe("png");
  });

  it("returns 502 when Google fails or yields no image", async () => {
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const res = await POST(
      new Request("http://x/api/logo", { method: "POST", body: JSON.stringify({ logoPrompt: "A brass owl" }) }),
    );
    expect(res.status).toBe(502);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "nope" }] } }] }) }),
    );
    const res2 = await POST(
      new Request("http://x/api/logo", { method: "POST", body: JSON.stringify({ logoPrompt: "A brass owl" }) }),
    );
    expect(res2.status).toBe(502);
  });
});
