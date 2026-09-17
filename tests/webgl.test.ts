import { describe, expect, it } from "vitest";
import { isWebGLAvailable } from "../lib/webgl";

describe("webgl probe", () => {
  it("returns false without DOM", () => {
    expect(isWebGLAvailable()).toBe(false);
  });
});
