"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";
import { isWebGLAvailable } from "../lib/webgl";

export default function CharacterStage() {
  const mount = useRef<HTMLDivElement>(null);
  const yaw = useRef(-0.18);
  const pitch = useRef(0.05);
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- probe on mount only
    setWebgl(isWebGLAvailable());
    setProbed(true);
  }, []);

  useEffect(() => {
    if (!webgl || !mount.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let raf = 0;
    let renderer: { dispose: () => void } | null = null;
    const disposables: { dispose: () => void }[] = [];
    const el = mount.current;

    void import("three")
      .then((THREE) => {
        if (!alive || !el.isConnected) return;
        const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer = r;
        r.setSize(300, 300);
        r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(r.domElement);

        const sc = new THREE.Scene();
        scene = sc;
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.z = 4.2;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
        sc.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xfff5ea, 1.2);
        dirLight.position.set(3, 4, 5);
        sc.add(dirLight);

        // Load Kentir mascot texture on a coin
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load("/kentir.png", (tex) => {
          if (!alive) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          disposables.push(tex);

          // Cylinder coin geometry
          const radius = 1.35;
          const height = 0.16;
          const segments = 48;
          const geo = new THREE.CylinderGeometry(radius, radius, height, segments);

          // Side material (lacquer crimson / gold edge)
          const edgeMat = new THREE.MeshStandardMaterial({
            color: 0xb82535,
            metalness: 0.5,
            roughness: 0.3,
          });

          // Face material with texture
          const faceMat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.4,
            metalness: 0.1,
          });

          // Cylinder faces: [0: side, 1: top, 2: bottom]
          const mesh = new THREE.Mesh(geo, [edgeMat, faceMat, faceMat]);
          disposables.push(geo, edgeMat, faceMat);
          // Rotate cylinder so faces point front/back
          mesh.rotation.x = Math.PI / 2;

          // Outer holder group for pitch/yaw rotation
          const coinGroup = new THREE.Group();
          coinGroup.add(mesh);
          sc.add(coinGroup);

          const spin = () => {
            if (!alive) return;
            const autoSpin = reduced ? 0 : performance.now() / 8000;
            coinGroup.rotation.y = yaw.current + autoSpin;
            coinGroup.rotation.x = pitch.current;
            r.render(sc, camera);
            raf = requestAnimationFrame(spin);
          };
          spin();
          setReady(true);
        });
      })
      .catch(() => {});

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      el.replaceChildren();
      for (const d of disposables) d.dispose();
      renderer?.dispose();
    };
  }, [webgl]);

  function nudge(d: number) {
    yaw.current += d;
  }

  if (probed && !webgl) {
    return (
      <div className="character-pedestal" aria-label="Character stage">
        <div className="character-frame">
          <Image
            src="/kentir.png"
            alt="Kentir mascot"
            width={260}
            height={260}
            priority
            className="character-img"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="character-pedestal" aria-label="Character stage">
      <div
        className="character-frame"
        ref={mount}
        tabIndex={0}
        role="img"
        aria-label="Kentir 3D coin figure. Use arrow keys or drag to rotate."
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") nudge(-0.25);
          if (e.key === "ArrowRight") nudge(0.25);
        }}
        onPointerDown={(e) => {
          const startX = e.clientX;
          const startY = e.clientY;
          const startYaw = yaw.current;
          const startPitch = pitch.current;
          const move = (ev: PointerEvent) => {
            yaw.current = startYaw + (ev.clientX - startX) / 100;
            pitch.current = Math.max(-0.4, Math.min(0.4, startPitch + (ev.clientY - startY) / 200));
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
      >
        {!ready && (
          <Image
            src="/kentir.png"
            alt="Kentir mascot"
            width={260}
            height={260}
            priority
            className="character-img"
          />
        )}
      </div>

      <div className="character-toolbar">
        <button
          type="button"
          onClick={() => nudge(-0.3)}
          className="character-arrow-btn"
          aria-label="Rotate left"
          title="Rotate left"
        >
          <ArrowLeft size={13} />
        </button>
        <span className="character-hint">Drag or use arrows to turn</span>
        <button
          type="button"
          onClick={() => nudge(0.3)}
          className="character-arrow-btn"
          aria-label="Rotate right"
          title="Rotate right"
        >
          <ArrowRight size={13} />
        </button>
        <button
          type="button"
          className="character-reset-btn"
          onClick={() => {
            yaw.current = -0.18;
            pitch.current = 0.05;
          }}
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
