import { SparkleLink } from './SparkleLink';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export function DashboardFooter() {
  return (
    <div className={cx(styles, 'dashboard-footer', 'fade-in')}>
      <SparkleLink href="/">
        <i className="fas fa-home"></i> Retour à l&apos;accueil
      </SparkleLink>
      <span style={{ display: 'inline-block', margin: '0 10px', color: 'var(--text-secondary)' }}>
        <i className="fas fa-heart" style={{ color: '#EF4444' }}></i>
      </span>
      <SparkleLink href="/feedback">
        <i className="fas fa-comment-dots"></i> Feedback
      </SparkleLink>
    </div>
  );
}
