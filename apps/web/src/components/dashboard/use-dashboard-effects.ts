import { useEffect } from 'react';
import styles from '@/styles/dashboard.module.css';

/** Glowing dot that follows the cursor and fades out after a second of inactivity. */
export function useMouseTracker() {
  useEffect(() => {
    const tracker = document.createElement('div');
    tracker.className = styles['mouse-tracker'];
    document.body.appendChild(tracker);

    let timer: ReturnType<typeof setTimeout>;

    const onMove = (e: MouseEvent) => {
      tracker.style.opacity = '1';
      tracker.style.left = `${e.clientX}px`;
      tracker.style.top = `${e.clientY}px`;
      clearTimeout(timer);
      timer = setTimeout(() => {
        tracker.style.opacity = '0';
      }, 1000);
    };

    const onLeave = () => {
      tracker.style.opacity = '0';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      clearTimeout(timer);
      tracker.remove();
    };
  }, []);
}

/** A short pulse on the clicked button. */
export function useButtonPulse() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(`button, .${styles['dashboard-btn']}`) as HTMLElement | null;
      if (btn) {
        btn.classList.add(styles['pulse-animation']);
        setTimeout(() => btn.classList.remove(styles['pulse-animation']), 300);
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

/** 3D tilt of the action cards following the cursor; binds once the cards are rendered. */
export function useCardTilt(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const cards = document.querySelectorAll<HTMLElement>(`.${styles['action-card']}`);

    const handlers = new Map<HTMLElement, { move: (e: MouseEvent) => void; leave: () => void }>();

    cards.forEach((card) => {
      const move = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const mx = e.clientX - cx;
        const my = e.clientY - cy;
        const max = 8;
        const ry = (max * mx) / (rect.width / 2);
        const rx = (-max * my) / (rect.height / 2);
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      };
      const leave = () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        setTimeout(() => {
          card.style.transform = '';
        }, 300);
      };
      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      handlers.set(card, { move, leave });
    });

    return () => {
      handlers.forEach(({ move, leave }, card) => {
        card.removeEventListener('mousemove', move);
        card.removeEventListener('mouseleave', leave);
      });
    };
  }, [ready]);
}
