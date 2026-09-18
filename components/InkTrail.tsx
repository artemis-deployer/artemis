"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const InkTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check fine pointer support and reduced motion
    if (!window.matchMedia('(any-pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const CONFIG = {
      bgColor: '#000000',
      inkColor: '#fae8a4',
      brushSize: 0.012,
      deposit: 1.10,
      smear: 5.5,
      decay: 0.94,
      diffuse: 0.16,
      edgeRagged: 0.18,
      threshold: 0.42,
      bleedHalo: 0.40,
      splatter: 0.18,
      inkTexture: 0.28,
      paperGrain: 0.06,
      vignette: 0.30,
      clickBlot: 1.6
    };

    function hexToVec3(hex: string) {
      const n = parseInt(hex.slice(1), 16);
      return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 0, 1);
    scene.add(camera);

    const dpr = Math.min(1, 1100 / window.innerWidth);
    let simW = Math.max(2, Math.round(window.innerWidth * dpr));
    let simH = Math.max(2, Math.round(window.innerHeight * dpr));

    const makeRT = (w: number, h: number) => {
      return new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false,
        stencilBuffer: false
      });
    };

    const rtA = makeRT(simW, simH);
    const rtB = makeRT(simW, simH);
    let readRT = rtA;
    let writeRT = rtB;

    const clearRT = (rt: THREE.WebGLRenderTarget) => {
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, false, false);
      renderer.setRenderTarget(prev);
      renderer.setClearColor(0x000000, 0);
    };

    clearRT(rtA);
    clearRT(rtB);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();

    const NOISE_GLSL = `
      float hash21(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash21(i), b = hash21(i + vec2(1.,0.)), c = hash21(i + vec2(0.,1.)), d = hash21(i + vec2(1.,1.));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p *= 2.02; a *= 0.5; } return s; }
      float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0); return length(pa - ba * h); }
    `;

    const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

    const updateUniforms = {
      uPrev: { value: readRT.texture },
      uResolution: { value: new THREE.Vector2(simW, simH) },
      uP0: { value: new THREE.Vector2(0.5, 0.5) },
      uP1: { value: new THREE.Vector2(0.5, 0.5) },
      uActive: { value: 0 },
      uSpeed: { value: 0 },
      uRadius: { value: CONFIG.brushSize },
      uDeposit: { value: CONFIG.deposit },
      uSmear: { value: CONFIG.smear },
      uDecay: { value: CONFIG.decay },
      uDiffuse: { value: CONFIG.diffuse },
      uClick: { value: 0 },
      uTime: { value: 0 }
    };

    const updateMat = new THREE.ShaderMaterial({
      uniforms: updateUniforms,
      vertexShader: FS_VERT,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uPrev;
        uniform vec2 uResolution, uP0, uP1;
        uniform float uActive, uSpeed, uRadius, uDeposit, uSmear, uDecay, uDiffuse, uClick, uTime;
        ${NOISE_GLSL}
        void main(){
          vec2 uv = vUv;
          vec2 texel = 1.0 / uResolution;
          float c = texture2D(uPrev, uv).r;
          float n = texture2D(uPrev, uv + vec2(0.0, texel.y)).r;
          float s = texture2D(uPrev, uv - vec2(0.0, texel.y)).r;
          float e = texture2D(uPrev, uv + vec2(texel.x, 0.0)).r;
          float w = texture2D(uPrev, uv - vec2(texel.x, 0.0)).r;
          float blur = (n + s + e + w) * 0.25;
          float val = mix(c, blur, clamp(uDiffuse, 0.0, 1.0)) * uDecay;
          float aspect = uResolution.x / uResolution.y;
          vec2 p = vec2(uv.x * aspect, uv.y);
          vec2 a = vec2(uP0.x * aspect, uP0.y);
          vec2 b = vec2(uP1.x * aspect, uP1.y);
          float d = sdSeg(p, a, b);
          float ang = atan(p.y - b.y, p.x - b.x);
          float wob = fbm(vec2(ang * 1.6 + 3.0, uTime * 0.6));
          float r = uRadius * (0.72 + 0.7 * wob) * (1.0 + uClick * 1.4);
          float amount = uDeposit * (0.55 + uSmear * uSpeed) + uClick;
          float stamp = smoothstep(r, r * 0.15, d) * amount * uActive;
          val += stamp;
          gl_FragColor = vec4(clamp(val, 0.0, 1.0), 0.0, 0.0, 1.0);
        }`,
      depthTest: false,
      depthWrite: false
    });

    const simScene = new THREE.Scene();
    const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), updateMat);
    simScene.add(simQuad);

    const displayUniforms = {
      uTrail: { value: readRT.texture },
      uResolution: { value: new THREE.Vector2(simW, simH) },
      uBg: { value: hexToVec3(CONFIG.bgColor) },
      uInk: { value: hexToVec3(CONFIG.inkColor) },
      uEdge: { value: CONFIG.edgeRagged },
      uThreshold: { value: CONFIG.threshold },
      uHalo: { value: CONFIG.bleedHalo },
      uAppear: { value: 1 },
      uTime: { value: 0 }
    };

    const displayMat = new THREE.ShaderMaterial({
      uniforms: displayUniforms,
      transparent: true,
      vertexShader: FS_VERT,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTrail;
        uniform vec2 uResolution;
        uniform vec3 uBg, uInk;
        uniform float uEdge, uThreshold, uHalo, uAppear, uTime;
        ${NOISE_GLSL}
        void main(){
          vec2 uv = vUv;
          float aspect = uResolution.x / uResolution.y;
          vec2 sp = vec2(uv.x * aspect, uv.y);
          float t = texture2D(uTrail, uv).r;
          float edge = fbm(sp * 16.0 + 11.0) * 0.65 + fbm(sp * 33.0 + 4.0) * 0.35;
          float v = t + (edge - 0.5) * uEdge;
          float ink = smoothstep(uThreshold - 0.12, uThreshold + 0.10, v);
          float wet = smoothstep(0.03, uThreshold, t) * (1.0 - ink);
          gl_FragColor = vec4(uInk, clamp((ink + wet * uHalo) * 0.45, 0.0, 0.45));
        }`,
      depthTest: false,
      depthWrite: false
    });

    const displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMat);
    scene.add(displayMesh);

    let pCur = { x: 0.5, y: 0.5 };
    let pPrev = { x: 0.5, y: 0.5 };
    let movedFrame = false;
    let lastMove = -10;
    let lastInput = 0;
    let animationFrameId = 0;
    let lastT = performance.now() / 1000;

    const animate = () => {
      const t = performance.now() / 1000;
      const dt = Math.min(0.05, t - lastT);
      lastT = t;
      const dtn = dt * 60.0;

      if (performance.now() - lastInput < 1500) {
        const speed = Math.hypot(pCur.x - pPrev.x, pCur.y - pPrev.y);
        const active = movedFrame ? 1 : 0;

        updateUniforms.uP0.value.set(pPrev.x, pPrev.y);
        updateUniforms.uP1.value.set(pCur.x, pCur.y);
        updateUniforms.uActive.value = active;
        updateUniforms.uSpeed.value = speed;
        updateUniforms.uDeposit.value = CONFIG.deposit * dtn;
        updateUniforms.uDecay.value = Math.pow(CONFIG.decay, dtn);
        updateUniforms.uTime.value = t;
        updateUniforms.uPrev.value = readRT.texture;

        const prevTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(writeRT);
        renderer.render(simScene, camera);
        renderer.setRenderTarget(prevTarget);

        const tmp = readRT;
        readRT = writeRT;
        writeRT = tmp;

        pPrev = { x: pCur.x, y: pCur.y };
        movedFrame = false;

        displayUniforms.uTrail.value = readRT.texture;
        displayUniforms.uTime.value = t;

        renderer.setRenderTarget(null);
        renderer.setClearColor(0x000000, 0);
        renderer.render(scene, camera);

        animationFrameId = requestAnimationFrame(animate);
      } else {
        renderer.setRenderTarget(null);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        animationFrameId = 0;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const now = performance.now() / 1000;
      if (now - lastMove > 0.12) pPrev = { x, y };
      pCur = { x, y };
      lastMove = now;
      movedFrame = true;
      lastInput = performance.now();
      if (!animationFrameId) {
        lastT = performance.now() / 1000;
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      const ndpr = Math.min(1, 1100 / w);
      simW = Math.max(2, Math.round(w * ndpr));
      simH = Math.max(2, Math.round(h * ndpr));
      rtA.setSize(simW, simH);
      rtB.setSize(simW, simH);
      clearRT(rtA);
      clearRT(rtB);
      updateUniforms.uResolution.value.set(simW, simH);
      displayUniforms.uResolution.value.set(simW, simH);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
    };

    window.addEventListener('resize', resize);
    resize();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      rtA.dispose();
      rtB.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ink-trail pointer-events-none fixed inset-0 z-40 bg-transparent"
      aria-hidden="true"
    />
  );
};
