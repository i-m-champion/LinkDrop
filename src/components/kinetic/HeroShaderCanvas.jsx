import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform vec2 uRipple;
  uniform float uRippleTime;
  uniform vec3 uAccentA;
  uniform vec3 uAccentB;
  uniform float uIsDark;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 p = (uv - 0.5) * aspect;

    // Subtle pointer parallax
    vec2 m = (uMouse - 0.5) * aspect;
    float pointerDist = length(p - m);
    p += (m - p) * exp(-pointerDist * 2.4) * 0.14;

    // Click ripple
    float tRip = max(0.0, uTime - uRippleTime);
    float rDist = length(p - (uRipple - 0.5) * aspect);
    float rippleWave = sin(rDist * 24.0 - tRip * 7.5) * exp(-rDist * 4.2) * exp(-tRip * 1.9);
    p += normalize(p - (uRipple - 0.5) * aspect + 0.0001) * rippleWave * 0.035;

    float q = fbm(p * 1.9 + vec2(uTime * 0.07, -uTime * 0.05));
    float r = fbm(p * 2.3 + vec2(q * 1.6, uTime * 0.09));
    float f = fbm(p * 1.5 + r);

    vec3 baseLight = vec3(0.980, 0.976, 0.965);
    vec3 glow = mix(uAccentA, uAccentB, smoothstep(0.22, 0.88, f));
    float intensity = smoothstep(0.28, 0.95, f) * 0.19;
    float cursorHalo = exp(-pointerDist * 2.9) * 0.16;

    vec3 col = mix(baseLight, glow, clamp(intensity + cursorHalo + abs(rippleWave) * 0.35, 0.0, 0.55));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function HeroShaderCanvas({
  accentA = '#ff5e2b',
  accentB = '#8b5cf6',
  isDark = true,
}) {
  const containerRef = useRef(null);
  const uniformsRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRipple: { value: new THREE.Vector2(0.5, 0.5) },
      uRippleTime: { value: -10.0 },
      uAccentA: { value: new THREE.Color(accentA) },
      uAccentB: { value: new THREE.Color(accentB) },
      uIsDark: { value: isDark ? 1.0 : 0.0 },
    };
    uniformsRef.current = uniforms;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const targetMouse = { x: 0.5, y: 0.5 };
    const start = performance.now();
    let rafId = 0;

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    };

    const onPointerMove = (e) => {
      targetMouse.x = e.clientX / Math.max(window.innerWidth, 1);
      targetMouse.y = 1.0 - e.clientY / Math.max(window.innerHeight, 1);
    };

    const onPointerDown = (e) => {
      uniforms.uRipple.value.set(
        e.clientX / Math.max(window.innerWidth, 1),
        1.0 - e.clientY / Math.max(window.innerHeight, 1)
      );
      uniforms.uRippleTime.value = (performance.now() - start) / 1000;
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    const renderLoop = () => {
      const elapsed = (performance.now() - start) / 1000;
      uniforms.uTime.value = reducedMotion ? 1.2 : elapsed;
      uniforms.uMouse.value.x += (targetMouse.x - uniforms.uMouse.value.x) * 0.08;
      uniforms.uMouse.value.y += (targetMouse.y - uniforms.uMouse.value.y) * 0.08;
      renderer.render(scene, camera);
      if (!reducedMotion) {
        rafId = requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Dynamically tint shader accents when switching between platform workspaces
  useEffect(() => {
    if (!uniformsRef.current) return;
    uniformsRef.current.uAccentA.value.set(accentA);
    uniformsRef.current.uAccentB.value.set(accentB);
    uniformsRef.current.uIsDark.value = isDark ? 1.0 : 0.0;
  }, [accentA, accentB, isDark]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-95"
    />
  );
}

