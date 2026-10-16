import Link from 'next/link';
import { StarSVG } from './StarSVG';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export function SparkleLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(styles, 'dashboard-btn', 'dashboard-btn-primary', 'sparkle-btn')}
    >
      {children}
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className={cx(styles, `star-${n}`)}>
          <StarSVG />
        </div>
      ))}
    </Link>
  );
}
