import { StarSVG } from './StarSVG';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export function SparkleBtn({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      className={cx(styles, 'dashboard-btn', 'dashboard-btn-primary', 'sparkle-btn')}
      {...props}
    >
      {children}
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className={cx(styles, `star-${n}`)}>
          <StarSVG />
        </div>
      ))}
    </button>
  );
}
