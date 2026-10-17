import { SparkleLink } from './SparkleLink';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export function PackagesActionCard() {
  return (
    <div
      className={cx(styles, 'action-card', 'fade-in')}
      style={{ borderLeft: '4px solid #C850C0' }}
    >
      <div
        className={cx(styles, 'action-card-icon')}
        style={{
          background: 'linear-gradient(135deg, rgba(200, 80, 192, 0.2), rgba(200, 80, 192, 0.1))',
        }}
      >
        <i className="fas fa-plus-circle"></i>
      </div>
      <div className={cx(styles, 'action-card-content')}>
        <h3>
          <i className="fas fa-magic" style={{ marginRight: '0.5rem' }}></i>Mes Packages
        </h3>
        <p>
          <i
            className="fas fa-feather-alt"
            style={{ color: '#C850C0', marginRight: '0.25rem' }}
          ></i>
          Créez vos propres packages de mots.
        </p>
        <SparkleLink href="/packages">
          <i className="fas fa-bookmark"></i> Mes Packages
        </SparkleLink>
      </div>
    </div>
  );
}
