'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

const GLOW_STYLE: CSSProperties = {
  position: 'fixed',
  width: 300,
  height: 300,
  background: 'radial-gradient(circle,rgba(106,17,203,0.1),rgba(37,117,252,0.05),transparent 70%)',
  borderRadius: '50%',
  pointerEvents: 'none',
  transform: 'translate(-50%,-50%)',
  zIndex: 0,
  opacity: 0,
  transition: 'opacity 0.5s ease',
};

/** Glow that eases toward the cursor across the whole viewport */
export function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let mouseX = 0;
    let mouseY = 0;
    let glowX = 0;
    let glowY = 0;
    let frame = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (glow.style.opacity === '0') glow.style.opacity = '1';
    };
    const handleMouseLeave = () => {
      glow.style.opacity = '0';
    };
    const animate = () => {
      glowX += (mouseX - glowX) * 0.1;
      glowY += (mouseY - glowY) * 0.1;
      glow.style.left = `${glowX}px`;
      glow.style.top = `${glowY}px`;
      frame = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    animate();

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return <div ref={glowRef} className="mouse-glow" style={GLOW_STYLE} aria-hidden="true" />;
}
