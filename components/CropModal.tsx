"use client";

import { useEffect, useRef, useState } from "react";
import { CROP_SIZE, MAX_ZOOM, MIN_ZOOM, clampOffset, clampZoom, cropSquareParams } from "../lib/crop-image";

const VIEW = 300;

type Props = {
  src: string;
  fileName: string;
  fileType: string;
  onCancel: () => void;
  onDone: (file: File) => void;
};

export default function CropModal({ src, fileName, fileType, onCancel, onDone }: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onCancel]);

  function onZoom(z: number) {
    const nz = clampZoom(z);
    setZoom(nz);
    setOffset((o) => clampOffset(size.w, size.h, VIEW, nz, o.x, o.y));
  }

  async function confirm() {
    if (busy || size.w === 0) return;
    setBusy(true);
    setError("");
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!(w > 0 && h > 0)) throw new Error("crop_failed");
      const { sx, sy, sSize } = cropSquareParams(w, h, VIEW, zoom, offset.x, offset.y);
      if (!(sSize > 0)) throw new Error("crop_failed");
      const canvas = document.createElement("canvas");
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("crop_failed");
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, CROP_SIZE, CROP_SIZE);
      const type = fileType === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.92));
      if (!blob) throw new Error("crop_failed");
      const base = (fileName.replace(/\.[a-z0-9]+$/i, "") || "artwork").slice(0, 60);
      onDone(new File([blob], `${base}-1x1.${type === "image/png" ? "png" : "jpg"}`, { type }));
    } catch {
      setError("Crop failed. Try another image.");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop artwork square"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="flex w-full max-w-[360px] flex-col gap-3 rounded-xl border border-white/15 bg-[#1a1b1f] p-5 text-white shadow-2xl">
        <div>
          <h3 className="m-0 text-sm font-bold">Crop Artwork 1:1</h3>
          <p className="m-0 text-xs text-white/50">Drag to position · output {CROP_SIZE}x{CROP_SIZE}</p>
        </div>

        <div
          className="relative mx-auto overflow-hidden rounded-lg border border-white/15 bg-black/40"
          style={{ width: VIEW, maxWidth: "100%", aspectRatio: "1 / 1", touchAction: "none" }}
          onPointerDown={(e) => {
            if (busy) return;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            setOffset(clampOffset(size.w, size.h, VIEW, zoom, d.ox + (e.clientX - d.sx), d.oy + (e.clientY - d.sy)));
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL crop source */}
          <img
            src={src}
            alt="Crop preview"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setSize({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              userSelect: "none",
            }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/25" />
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <span>Zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={busy}
            onChange={(e) => onZoom(Number(e.target.value))}
            aria-label="Zoom crop"
            className="w-full accent-[#fae8a4]"
          />
        </label>

        {error && (
          <p role="alert" className="m-0 text-xs font-medium text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] font-semibold text-white/60 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || size.w === 0}
            onClick={() => void confirm()}
            className="cursor-pointer rounded-lg bg-[#fae8a4] px-4 py-2 text-sm font-bold text-[#18191c] hover:bg-[#ece4d4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Cropping…" : "Crop & Use"}
          </button>
        </div>
      </div>
    </div>
  );
}
