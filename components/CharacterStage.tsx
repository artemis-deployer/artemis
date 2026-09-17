"use client";

import { useEffect, useRef, useState } from "react";
import { isWebGLAvailable } from "../lib/webgl";

export default function CharacterStage() {
  const mount = useRef<HTMLDivElement>(null);
  const yaw = useRef(-0.18);
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only probe; first render matches SSR (div) on both sides, img only after probe
    setWebgl(isWebGLAvailable());
    setProbed(true);
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
        r.setSize(320, 320);
        el.appendChild(r.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 4;
        const g = new THREE.IcosahedronGeometry(1.2, 1);
        const m = new THREE.MeshStandardMaterial({ color: 0xb82535, wireframe: true });
        geo = g;
        mat = m;
        const mesh = new THREE.Mesh(g, m);
        scene.add(mesh);
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const spin = () => {
          if (!alive) return;
          mesh.rotation.y = yaw.current + (reduced ? 0 : performance.now() / 12000);
          r.render(scene, camera);
          raf = requestAnimationFrame(spin);
        };
        spin();
        setReady(true);
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

  if (probed && !webgl) {
    return <img src="/kentir.png" alt="Kentir character" />;
  }

  return (
    <div aria-label="Character stage">
      <div
        ref={mount}
        tabIndex={0}
        role="img"
        aria-label="Kentir 3D figure. Use left and right arrow keys to rotate."
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") nudge(-0.2);
          if (e.key === "ArrowRight") nudge(0.2);
        }}
        onPointerDown={(e) => {
          const startX = e.clientX;
          const startYaw = yaw.current;
          const move = (ev: PointerEvent) => {
            yaw.current = startYaw + (ev.clientX - startX) / 120;
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
      />
      {!ready && <img src="/kentir.png" alt="Kentir character" />}
      <div className="scene-controls">
        <span>Drag to turn · Arrow keys to rotate</span>
        <button
          type="button"
          onClick={() => {
            yaw.current = -0.18;
          }}
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
