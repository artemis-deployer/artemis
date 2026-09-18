"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { isWebGLAvailable } from "../lib/webgl";

export default function CharacterStage() {
  const mount = useRef<HTMLDivElement>(null);
  const yaw = useRef(-0.18);
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount only probe
    setWebgl(isWebGLAvailable());
  }, []);

  useEffect(() => {
    if (!webgl || !mount.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let raf = 0;
    let renderer: { dispose: () => void } | null = null;
    let geo: { dispose: () => void } | null = null;
    let mat: { dispose: () => void } | null = null;
    const el = mount.current;

    void import("three")
      .then((THREE) => {
        if (!alive || !el.isConnected) return;
        const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer = r;
        r.setSize(240, 240);
        r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(r.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 3.8;

        const g = new THREE.IcosahedronGeometry(1.2, 1);
        const m = new THREE.MeshStandardMaterial({
          color: 0xb82535,
          wireframe: true,
          roughness: 0.3,
        });
        geo = g;
        mat = m;
        const mesh = new THREE.Mesh(g, m);
        scene.add(mesh);
        scene.add(new THREE.AmbientLight(0xffffff, 1.4));

        const spin = () => {
          if (!alive) return;
          mesh.rotation.y = yaw.current + (reduced ? 0 : performance.now() / 10000);
          mesh.rotation.x = 0.2;
          r.render(scene, camera);
          raf = requestAnimationFrame(spin);
        };
        spin();
      })
      .catch(() => {});

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      el.replaceChildren();
      geo?.dispose();
      mat?.dispose();
      renderer?.dispose();
    };
  }, [webgl]);

  function nudge(d: number) {
    yaw.current += d;
  }

  if (!webgl) {
    return (
      <div className="crypto-stage" aria-label="Geometric 3D Stage">
        <div className="crypto-viewport" role="img" aria-label="Kentir coin emblem">
          <span aria-hidden="true" className="text-6xl text-[var(--accent)]">◎</span>
        </div>
        <div className="crypto-stage-bar">
          <span>3D unavailable — static emblem</span>
        </div>
      </div>
    );
  }

  return (
    <div className="crypto-stage" aria-label="Geometric 3D Stage">
      <div
        className="crypto-viewport"
        ref={mount}
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D geometry. Use arrow keys to rotate."
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") nudge(-0.25);
          if (e.key === "ArrowRight") nudge(0.25);
        }}
        onPointerDown={(e) => {
          const startX = e.clientX;
          const startYaw = yaw.current;
          const move = (ev: PointerEvent) => {
            yaw.current = startYaw + (ev.clientX - startX) / 100;
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
      />
      <div className="crypto-stage-bar">
        <span>3D Cryptographic Geometry</span>
        <button
          type="button"
          className="crypto-reset-btn"
          onClick={() => {
            yaw.current = -0.18;
          }}
          title="Reset rotation"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
