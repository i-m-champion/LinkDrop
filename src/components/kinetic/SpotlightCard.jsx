import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function SpotlightCard({
  children,
  className = '',
  spotColor = 'rgba(255, 94, 43, 0.65)',
  spotFill = 'rgba(255, 94, 43, 0.08)',
  tilt = true,
  maxTilt = 7,
  onClick,
  cursorLabel,
  ...rest
}) {
  const cardRef = useRef(null);
  const tiltHandlersRef = useRef({ rx: null, ry: null });

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !tilt) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) return;

    gsap.set(el, { transformPerspective: 950, transformStyle: 'preserve-3d' });
    tiltHandlersRef.current.rx = gsap.quickTo(el, 'rotateX', { duration: 0.45, ease: 'power3.out' });
    tiltHandlersRef.current.ry = gsap.quickTo(el, 'rotateY', { duration: 0.45, ease: 'power3.out' });
  }, [tilt]);

  const handlePointerMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);

    if (!tilt || !tiltHandlersRef.current.rx || !tiltHandlersRef.current.ry) return;
    const targetTag = e.target instanceof Element ? e.target.tagName : '';
    if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') return;

    const nx = (x / Math.max(rect.width, 1)) * 2 - 1;
    const ny = (y / Math.max(rect.height, 1)) * 2 - 1;
    tiltHandlersRef.current.rx(-ny * maxTilt);
    tiltHandlersRef.current.ry(nx * maxTilt);
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--mx', '-999px');
    el.style.setProperty('--my', '-999px');
    tiltHandlersRef.current.rx?.(0);
    tiltHandlersRef.current.ry?.(0);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      data-cursor={cursorLabel || undefined}
      style={{
        '--spot-color': spotColor,
        '--spot-fill': spotFill,
      }}
      className={`spotlight-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

