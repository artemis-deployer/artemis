"use client";

import { useEffect, useRef, useState } from "react";
import { isWebGLAvailable } from "../lib/webgl";

export default function CharacterStage() {
  const mount = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isWebGLAvailable() || !mount.current) return;
    let alive = true;
    let raf = 0;
    let renderer: { dispose: () => void } | null = null;
    const el = mount.current;
    void import("three").then((THREE) => {
      if (!alive || !el.isConnected) return;
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer = r;
      r.setSize(320, 320);
      el.appendChild(r.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 4;
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.2, 1),
        new THREE.MeshStandardMaterial({ color: 0xb82535, wireframe: true }),
      );
      scene.add(mesh);
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const spin = () => {
        if (!alive) return;
        mesh.rotation.y += 0.01;
        r.render(scene, camera);
        raf = requestAnimationFrame(spin);
      };
      spin();
      setReady(true);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      renderer?.dispose();
    };
  }, []);

  if (!ready && typeof window !== "undefined" && !isWebGLAvailable()) {
    return <img src="/kentir.png" alt="Kentir character" />;
  }
  return (
    <div aria-label="Character stage">
      <div ref={mount} />
      {!ready && <img src="/kentir.png" alt="Kentir character" />}
    </div>
  );
}
