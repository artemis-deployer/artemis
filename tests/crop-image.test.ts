import { describe, expect, it } from "vitest";
import { clampOffset, clampZoom, cropSquareParams, maxPanOffset } from "../lib/crop-image";

describe("clampZoom", () => {
  it("clamps to 1..3", () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(9)).toBe(3);
    expect(clampZoom(NaN)).toBe(1);
  });
});

describe("square crop math", () => {
  it("centers on landscape image at zoom 1", () => {
    const p = cropSquareParams(600, 300, 300, 1, 0, 0);
    expect(p.sSize).toBe(300);
    expect(p.sx).toBe(150);
    expect(p.sy).toBe(0);
  });

  it("centers on portrait image at zoom 1", () => {
    const p = cropSquareParams(300, 600, 300, 1, 0, 0);
    expect(p.sSize).toBe(300);
    expect(p.sx).toBe(0);
    expect(p.sy).toBe(150);
  });

  it("zooms into half the area at zoom 2", () => {
    const p = cropSquareParams(600, 600, 300, 2, 0, 0);
    expect(p.sSize).toBe(300);
    expect(p.sx).toBe(150);
    expect(p.sy).toBe(150);
  });

  it("pans with offset and stays inside", () => {
    const p = cropSquareParams(600, 300, 300, 1, -50, 0);
    expect(p.sx).toBeGreaterThan(150);
    expect(p.sx + p.sSize).toBeLessThanOrEqual(600);
    expect(p.sy).toBe(0);
  });

  it("clamps wild offsets inside the image", () => {
    const p = cropSquareParams(600, 300, 300, 1, 99999, -99999);
    expect(p.sx).toBe(0);
    expect(p.sy).toBe(0);
    expect(p.sx + p.sSize).toBeLessThanOrEqual(600);
  });

  it("rejects empty inputs", () => {
    expect(cropSquareParams(0, 100, 300)).toEqual({ sx: 0, sy: 0, sSize: 0 });
  });
});

describe("pan limits", () => {
  it("allows no pan on square image at zoom 1", () => {
    expect(maxPanOffset(400, 400, 300, 1)).toEqual({ x: 0, y: 0 });
  });

  it("opens pan room when zoomed", () => {
    const m = maxPanOffset(400, 400, 300, 2);
    expect(m.x).toBeGreaterThan(0);
    expect(m.y).toBeGreaterThan(0);
  });

  it("clampOffset respects limits", () => {
    const c = clampOffset(400, 400, 300, 1, 99, -99);
    expect(c).toEqual({ x: 0, y: 0 });
  });
});
