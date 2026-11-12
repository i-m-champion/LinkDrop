import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function KineticCursor() {
  const [enabled, setEnabled] = useState(false);
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const labelRef = useRef(null);
  const shockRef = useRef(null);

  useEffect(() => {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isCoarse || reducedMotion) return;

    setEnabled(true);
    document.documentElement.classList.add('kinetic-cursor-active');

    return () => {
      document.documentElement.classList.remove('kinetic-cursor-active');
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    const labelEl = labelRef.current;
    const shock = shockRef.current;
    if (!ring || !dot || !labelEl || !shock) return;

    gsap.set([ring, dot, shock], { xPercent: -50, yPercent: -50, opacity: 0 });

    const ringX = gsap.quickTo(ring, 'x', { duration: 0.28, ease: 'power3.out' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.28, ease: 'power3.out' });
    const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2.out' });
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2.out' });

    let visible = false;
    let activeLabel = '';

    const setCursorState = (text, isInteractive) => {
      if (text) {
        if (activeLabel !== text) {
          labelEl.textContent = text;
          activeLabel = text;
        }
        gsap.to(ring, {
          width: Math.max(74, text.length * 9 + 28),
          height: 34,
          borderRadius: 999,
          backgroundColor: 'rgba(255, 94, 43, 0.92)',
          borderColor: 'rgba(255, 255, 255, 0.45)',
          duration: 0.24,
          ease: 'power3.out',
        });
        gsap.to(labelEl, { opacity: 1, scale: 1, duration: 0.18 });
        gsap.to(dot, { opacity: 0, scale: 0.3, duration: 0.15 });
      } else if (isInteractive) {
        activeLabel = '';
        gsap.to(ring, {
          width: 46,
          height: 46,
          borderRadius: 999,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderColor: 'rgba(255, 94, 43, 0.75)',
          duration: 0.22,
          ease: 'power3.out',
        });
        gsap.to(labelEl, { opacity: 0, scale: 0.85, duration: 0.12 });
        gsap.to(dot, { opacity: 1, scale: 1.3, duration: 0.15 });
      } else {
        activeLabel = '';
        gsap.to(ring, {
          width: 34,
          height: 34,
          borderRadius: 999,
          backgroundColor: 'transparent',
          borderColor: 'rgba(244, 241, 234, 0.45)',
          duration: 0.22,
          ease: 'power3.out',
        });
        gsap.to(labelEl, { opacity: 0, scale: 0.85, duration: 0.12 });
        gsap.to(dot, { opacity: 1, scale: 1, duration: 0.15 });
      }
    };

    const onMove = (e) => {
      if (!visible) {
        visible = true;
        gsap.to([ring, dot], { opacity: 1, duration: 0.2 });
      }
      ringX(e.clientX);
      ringY(e.clientY);
      dotX(e.clientX);
      dotY(e.clientY);

      const target = e.target instanceof Element ? e.target : null;
      const cursorTarget = target?.closest('[data-cursor]');
      const interactiveTarget = target?.closest('a, button, select, input, textarea, [role="button"]');
      const labelText = cursorTarget?.getAttribute('data-cursor') || '';
      setCursorState(labelText, Boolean(interactiveTarget));
    };

    const onDown = (e) => {
      gsap.set(shock, { x: e.clientX, y: e.clientY, scale: 0.25, opacity: 0.85 });
      gsap.to(shock, {
        scale: 2.3,
        opacity: 0,
        duration: 0.48,
        ease: 'power2.out',
      });
      gsap.to(ring, { scale: 0.88, duration: 0.1, yoyo: true, repeat: 1 });
    };

    const onLeave = () => {
      visible = false;
      gsap.to([ring, dot], { opacity: 0, duration: 0.2 });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Click shockwave */}
      <div
        ref={shockRef}
        className="fixed left-0 top-0 h-10 w-10 rounded-full border border-[#ff5e2b] opacity-0"
      />
      {/* Morphing Reticle Ring */}
      <div
        ref={ringRef}
        className="fixed left-0 top-0 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#f4f1ea]/45 backdrop-blur-[1px]"
      >
        <span
          ref={labelRef}
          className="font-mono text-[10px] font-bold tracking-[0.14em] text-white opacity-0 select-none"
        />
      </div>
      {/* Inner Precision Dot */}
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-2 w-2 rounded-full bg-[#ff5e2b] shadow-[0_0_12px_#ff5e2b]"
      />
    </div>
  );
}

