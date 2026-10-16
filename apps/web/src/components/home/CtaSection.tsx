import Link from 'next/link';
import { cx } from '@/lib/css-module';
import authStyles from '@/styles/auth.module.css';
import homeStyles from '@/styles/home.module.css';

export function CtaSection() {
  return (
    <section className={authStyles['cta-section']}>
      <div className={authStyles['cta-content']}>
        <h2>Ready to Expand Your Vocabulary?</h2>
        <p>Join thousands of users who are already improving their language skills</p>
        <div className={authStyles['cta-buttons']}>
          <Link href="/register" className={`${cx(authStyles, 'btn', 'btn-primary', 'btn-large')} ${cx(homeStyles, 'btn', 'btn-primary', 'btn-large')}`}>
            <i className="fas fa-user-plus" /> Register Now
          </Link>
          <Link href="/login" className={`${cx(authStyles, 'btn', 'btn-secondary', 'btn-large')} ${cx(homeStyles, 'btn', 'btn-secondary', 'btn-large')}`}>
            <i className="fas fa-sign-in-alt" /> Login
          </Link>
        </div>
      </div>
    </section>
  );
}
