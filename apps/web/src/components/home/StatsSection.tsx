import styles from '@/styles/auth.module.css';
import { SectionHeading } from './SectionHeading';

const STATS = [
  {
    icon: 'fas fa-book',
    label: 'Access your vocabulary practice on any device, anytime, anywhere',
  },
  {
    icon: 'fas fa-gamepad',
    label: 'Reinforce your learning with fun and engaging vocabulary games',
  },
  {
    icon: 'fas fa-users',
    label: 'Monitor your improvement and vocabulary growth over time',
  },
];

export function StatsSection() {
  return (
    <section className={styles['stats-section']}>
      <SectionHeading title="Why Choose SEALVO ?" />

      <div className={styles['stats-counter']}>
        {STATS.map((stat) => (
          <div key={stat.icon} className={styles['counter-item']}>
            <div className={styles['counter-icon']}>
              <i className={stat.icon} />
            </div>
            <span className={styles['counter-label']}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
