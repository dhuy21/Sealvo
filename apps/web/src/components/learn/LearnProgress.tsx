import type { ReactNode } from 'react';
import { AnimatedCounter } from './AnimatedCounter';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function LearnProgress({
  progress,
  reviewCount,
  remainingCount,
  knownCount,
  animation,
  children,
}: {
  progress: number;
  reviewCount: number;
  remainingCount: number;
  knownCount: number;
  animation: string;
  children: ReactNode;
}) {
  return (
    <div className={cx(styles, 'progress-container', animation)}>
      <div className={cx(styles, 'progress-header')}>
        <h3>Votre progression</h3>
        <span>{progress}%</span>
      </div>
      <div className={cx(styles, 'progress-bar')}>
        <div
          className={cx(styles, 'progress')}
          style={{ width: `${progress}%`, transition: 'width 0.7s cubic-bezier(0.19, 1, 0.22, 1)' }}
        ></div>
      </div>
      <div className={cx(styles, 'progress-stats')}>
        <div className={cx(styles, 'progress-stat')}>
          <span className={cx(styles, 'stat-icon', 'red')}>
            <i className="fas fa-redo"></i>
          </span>
          <span>
            <AnimatedCounter value={reviewCount} />
          </span>
        </div>
        <div className={cx(styles, 'progress-stat')}>
          <span className={cx(styles, 'stat-icon')}>
            <i className="fas fa-minus-circle"></i>
          </span>
          <span>
            <AnimatedCounter value={remainingCount} />
          </span>
        </div>
        <div className={cx(styles, 'progress-stat')}>
          <span className={cx(styles, 'stat-icon', 'green')}>
            <i className="fas fa-check"></i>
          </span>
          <span>
            <AnimatedCounter value={knownCount} />
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
