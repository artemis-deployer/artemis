"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BlockyGridCanvasProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

export const BlockyGridCanvas: React.FC<BlockyGridCanvasProps> = ({ sectionRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const rawTarget = sectionRef.current || container?.parentElement;
    if (!container || !rawTarget) return;
    const targetSection: HTMLElement = rawTarget;

    // Check reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Create fresh canvas dynamically to prevent React StrictMode WebGL context collisions
    const canvas = document.createElement('canvas');
    canvas.className = 'privacy-grid';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-2';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.95';
    canvas.style.maskImage = 'linear-gradient(transparent, #000 13%, #000 85%, transparent)';
    canvas.style.webkitMaskImage = 'linear-gradient(transparent, #000 13%, #000 85%, transparent)';
    container.appendChild(canvas);

    const CONFIG = {
      bgColor: '#e2caf3',    // lavender base
      underColor: '#99cce7', // sky-blue revealed on tile sides as it lifts
      edgeColor: '#ffffff',  // bright white rim lights raised tile top edges
      shadeColor: '#bc91d5', // cool ambient on exposed blue sides
      gridCols: 48,
      gridRows: 50,
      spacing: 0.48,
      tileScale: 0.9,
      tileHeight: 0.38,
      riseHeight: 1.45,
      diffuse: 0.6,
      fresnel: 0.5,
      edgeWidth: 0.09,
      edgeGlow: 1.0,
      underGlow: 1.8,
      pointerRadius: 4.2,
      pointerLift: 1.2,
      pulseSpeed: 5.0,
      pulseWidth: 1.7,
      fogNear: 8.0,
      fogFar: 28.0,
      camDist: 9.5
    };

    function hexToVec3(hex: string) {
      const n = parseInt(hex.slice(1), 16);
      return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: true
      });
    } catch {
      canvas.remove();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.bgColor);

    const camera = new THREE.PerspectiveCamera(42, targetSection.clientWidth / targetSection.clientHeight, 0.1, 200);
    camera.position.set(4.5, 11.5, 9);
    const target = new THREE.Vector3(0, 0.3, 0);
    camera.position.sub(target).normalize().multiplyScalar(CONFIG.camDist).add(target);
    camera.lookAt(target);
    scene.add(camera);

    const uniforms = {
      iTime: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uPointer: { value: new THREE.Vector2(999, 999) },
      uBg: { value: hexToVec3(CONFIG.bgColor) },
      uUnder: { value: hexToVec3(CONFIG.underColor) },
      uEdge: { value: hexToVec3(CONFIG.edgeColor) },
      uShade: { value: hexToVec3(CONFIG.shadeColor) },
      uFogColor: { value: hexToVec3(CONFIG.bgColor) },
      uTileW: { value: CONFIG.spacing * CONFIG.tileScale },
      uHeight: { value: CONFIG.tileHeight },
      uRiseHeight: { value: CONFIG.riseHeight },
      uDiffuse: { value: CONFIG.diffuse },
      uFresnel: { value: CONFIG.fresnel },
      uEdgeWidth: { value: CONFIG.edgeWidth },
      uEdgeGlow: { value: CONFIG.edgeGlow },
      uUnderGlow: { value: CONFIG.underGlow },
      uPtrRadius: { value: CONFIG.pointerRadius },
      uPtrLift: { value: CONFIG.pointerLift },
      uPulseTime: { value: new Array(8).fill(-999) },
      uPulseCenter: { value: Array.from({ length: 8 }, () => new THREE.Vector2(0, 0)) },
      uPulseSpeed: { value: CONFIG.pulseSpeed },
      uPulseWidth: { value: CONFIG.pulseWidth },
      uFogNear: { value: CONFIG.fogNear },
      uFogFar: { value: CONFIG.fogFar },
      uLightDir: { value: new THREE.Vector3(0.5, 0.62, 0.4).normalize() }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        precision highp float;
        attribute vec3 aGrid;
        attribute float aRand;
        uniform float iTime, uTileW, uHeight, uRiseHeight;
        uniform float uPtrRadius, uPtrLift, uPulseSpeed, uPulseWidth;
        uniform vec2 uPointer;
        uniform vec2 uPulseCenter[8];
        uniform float uPulseTime[8];
        varying vec3 vNormal, vWorld, vLocal;
        varying float vLift;

        void main(){
          vLocal = position;
          float pd = distance(aGrid.xz, uPointer);
          float f = clamp(1.0 - pd / uPtrRadius, 0.0, 1.0);
          float lift = uPtrLift * f * f * (3.0 - 2.0 * f);

          // Concurrent click ripples
          for (int i = 0; i < 8; i++) {
            float age = iTime - uPulseTime[i];
            if (age < 0.0 || age > 3.5) continue;
            float front = age * uPulseSpeed;
            float r = distance(aGrid.xz, uPulseCenter[i]);
            lift += exp(-pow((r - front) / uPulseWidth, 2.0)) * smoothstep(3.5, 0.0, age);
          }

          lift = clamp(lift, 0.0, 1.0);
          vLift = lift;

          vec3 sp = vec3(position.x * uTileW, position.y * uHeight, position.z * uTileW);
          vec3 wp = aGrid + sp;
          wp.y += lift * uRiseHeight - (uHeight * 0.5 + 0.04);

          vNormal = position.y > 0.49 ? vec3(0.0, 1.0, 0.0)
                  : position.y < -0.49 ? vec3(0.0, -1.0, 0.0)
                  : normalize(vec3(position.x, 0.0, position.z));
          vWorld = wp;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform vec3 uBg, uUnder, uEdge, uShade, uFogColor, uCam, uLightDir;
        uniform float uDiffuse, uFresnel, uEdgeWidth, uEdgeGlow, uUnderGlow, uFogNear, uFogFar;
        varying vec3 vNormal, vWorld, vLocal;
        varying float vLift;

        void main(){
          vec3 N = normalize(vNormal);
          vec3 V = normalize(uCam - vWorld);
          vec3 col;
          if (N.y > 0.5) {
            col = uBg;
            vec3 a = 0.5 - abs(vLocal);
            float mx = max(a.x, max(a.y, a.z));
            float mn = min(a.x, min(a.y, a.z));
            float mid = a.x + a.y + a.z - mx - mn;
            float edge = 1.0 - smoothstep(0.0, uEdgeWidth, mid);
            float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
            col += (edge * uEdge * uEdgeGlow + fres * uFresnel * uUnder) * vLift;
          } else {
            float dif = max(dot(N, uLightDir), 0.0);
            vec3 base = mix(uBg, uUnder, clamp(vLift * uUnderGlow, 0.0, 1.0));
            vec3 lit = base * (uShade + dif * uDiffuse);
            col = mix(uBg, lit, clamp(vLift, 0.0, 1.0));
          }
          float fog = smoothstep(uFogNear, uFogFar, distance(uCam, vWorld));
          col = mix(col, uFogColor, fog);
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.FrontSide
    });

    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(CONFIG.bgColor) })
    );
    base.rotation.x = -Math.PI / 2;
    scene.add(base);

    const cols = CONFIG.gridCols, rows = CONFIG.gridRows, sp = CONFIG.spacing;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = box.index;
    geo.setAttribute('position', box.attributes.position);
    geo.setAttribute('normal', box.attributes.normal);

    const count = cols * rows;
    const grid = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    const ox = (cols - 1) * 0.5, oz = (rows - 1) * 0.5;
    let idx = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        grid[idx * 3] = (c - ox) * sp;
        grid[idx * 3 + 1] = 0;
        grid[idx * 3 + 2] = (r - oz) * sp;
        const jit = (Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
        rand[idx] = jit < 0 ? jit + 1 : jit;
        idx++;
      }
    }
    geo.setAttribute('aGrid', new THREE.InstancedBufferAttribute(grid, 3));
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 1));
    geo.instanceCount = count;

    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    const ext = Math.max(cols, rows) * sp * 1.4;
    base.scale.set(ext, ext, 1);
    base.position.y = 0;

    let pulseIdx = 0;
    function pulse(x: number, z: number) {
      uniforms.uPulseCenter.value[pulseIdx].set(x, z);
      uniforms.uPulseTime.value[pulseIdx] = uniforms.iTime.value;
      pulseIdx = (pulseIdx + 1) % 8;
    }

    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();

    function getPointerHit(e: PointerEvent | MouseEvent) {
      const r = targetSection.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(groundPlane, hit);
    }

    const pointerTarget = new THREE.Vector2();
    const pointerCurrent = new THREE.Vector2();
    let hoverTarget = 0, hoverStrength = 0, pointerInitialized = false, lastFrame = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !getPointerHit(e)) return;
      pointerTarget.set(hit.x, hit.z);
      if (!pointerInitialized) {
        pointerCurrent.copy(pointerTarget);
        pointerInitialized = true;
      }
      hoverTarget = 1;
    };

    const onPointerLeave = () => { hoverTarget = 0; };
    const onClick = (e: MouseEvent) => {
      if (getPointerHit(e)) pulse(hit.x, hit.z);
    };

    targetSection.addEventListener('pointermove', onPointerMove as EventListener, { passive: true });
    targetSection.addEventListener('pointerleave', onPointerLeave as EventListener);
    targetSection.addEventListener('click', onClick as EventListener);

    let animationFrameId = 0;
    function resize() {
      const w = targetSection.clientWidth, h = targetSection.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function render() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
      lastFrame = now;

      pointerCurrent.lerp(pointerTarget, 1 - Math.exp(-dt / 0.14));
      hoverStrength += (hoverTarget - hoverStrength) * (1 - Math.exp(-dt / (hoverTarget ? 0.22 : 0.38)));
      if (hoverStrength < 0.001 && !hoverTarget) {
        hoverStrength = 0;
        pointerInitialized = false;
      }

      uniforms.iTime.value = now / 1000;
      uniforms.uCam.value.copy(camera.position);
      uniforms.uPointer.value.copy(pointerCurrent);
      uniforms.uPtrLift.value = CONFIG.pointerLift * hoverStrength;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(targetSection);
    resize();

    uniforms.iTime.value = performance.now() / 1000;
    pulse(0, 0);
    setTimeout(() => pulse(1.2, -1.5), 600);

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      targetSection.removeEventListener('pointermove', onPointerMove as EventListener);
      targetSection.removeEventListener('pointerleave', onPointerLeave as EventListener);
      targetSection.removeEventListener('click', onClick as EventListener);
      renderer.dispose();
      geo.dispose();
      material.dispose();
      canvas.remove();
    };
  }, [sectionRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none -z-10"
      aria-hidden="true"
    />
  );
};
