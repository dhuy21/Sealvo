import { useEffect, useRef } from 'react';
import styles from '@/styles/games/speed-vocab.module.css';

const isMobile = () => window.innerWidth <= 432;

/** Faster and brighter effects as the remaining time drops. */
function intensityFor(timer: number): number {
  if (timer > 100) return 1;
  if (timer > 50) return 1.5;
  if (timer > 20) return 2;
  return 3;
}

/**
 * Rising particles behind the page for its whole lifetime, and speed lines inside
 * the active screen while a game runs. Like the old page, both creation intervals
 * restart on every timer tick at the current intensity.
 */
export function useSpeedBackground(active: boolean, timer: number) {
  const particlesRef = useRef<HTMLDivElement | null>(null);
  const speedLinesRef = useRef<HTMLDivElement | null>(null);
  const intensityRef = useRef(1);

  useEffect(() => {
    const container = document.createElement('div');
    container.className = styles['particles'];
    document.body.appendChild(container);
    particlesRef.current = container;

    const count = isMobile() ? 8 : 15;
    const timeouts = Array.from({ length: count }, (_, i) =>
      setTimeout(() => createParticle(container, intensityRef.current), i * 200),
    );

    return () => {
      timeouts.forEach(clearTimeout);
      container.remove();
      particlesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (active) intensityRef.current = intensityFor(timer);
    const intensity = intensityRef.current;
    const mobile = isMobile();

    const particleInterval = setInterval(
      () => {
        if (particlesRef.current) createParticle(particlesRef.current, intensity);
      },
      Math.max(200, (mobile ? 1200 : 800) / intensity),
    );

    const speedLineInterval = setInterval(
      () => {
        if (active && speedLinesRef.current) createSpeedLine(speedLinesRef.current, intensity);
      },
      Math.max(100, (mobile ? 500 : 300) / intensity),
    );

    return () => {
      clearInterval(particleInterval);
      clearInterval(speedLineInterval);
    };
  }, [active, timer]);

  return speedLinesRef;
}

function createParticle(container: HTMLElement, intensity: number): void {
  const particle = document.createElement('div');
  particle.className = styles['particle'];
  particle.style.left = `${Math.random() * 100}vw`;
  particle.style.animationDelay = `${Math.random() * 2}s`;
  particle.style.opacity = String(Math.min(1, 0.6 + (intensity - 1) * 0.2));
  particle.style.borderRadius = '50%';
  particle.style.boxSizing = 'border-box';
  particle.style.display = 'block';
  container.appendChild(particle);
  setTimeout(() => particle.remove(), isMobile() ? 12000 : 18000);
}

function createSpeedLine(container: HTMLElement, intensity: number): void {
  const line = document.createElement('div');
  line.className = styles['speed-line'];
  line.style.left = `${Math.random() * 100}%`;
  line.style.animationDelay = `${Math.random() * 0.5}s`;
  const scale = 1 + (intensity - 1) * 0.2;
  if (scale > 1) line.style.transform = `scale(${scale})`;
  line.style.opacity = String(Math.min(1, 0.6 + (intensity - 1) * 0.3));
  container.appendChild(line);
  setTimeout(() => line.remove(), isMobile() ? 1500 : 2000);
}
