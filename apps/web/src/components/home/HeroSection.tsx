import Link from 'next/link';
import { cx } from '@/lib/css-module';
import authStyles from '@/styles/auth.module.css';
import homeStyles from '@/styles/home.module.css';
import { HeroImage } from './HeroImage';

export function HeroSection() {
  return (
    <div className={authStyles['hero-section']}>
      <div className={authStyles['hero-content']}>
        <div className={authStyles['hero-text-container']}>
          <h1 className={`${authStyles['animated-title']} ${homeStyles['animated-title']}`}>
            Welcome to <span className={authStyles['glow-text']}>SEALVO</span>
          </h1>
          <p className={`${authStyles['subtitle']} ${homeStyles['subtitle']}`}>Enhance your vocabulary with our interactive learning platform!</p>

          <div className={authStyles['hero-cta']}>
            <Link href="/login" className={`${cx(authStyles, 'btn', 'btn-primary', 'btn-large')} ${cx(homeStyles, 'btn', 'btn-primary', 'btn-large')}`}>
              <i className="fas fa-sign-in-alt" /> Get Started
            </Link>
            <Link href="/about" className={`${cx(authStyles, 'btn', 'btn-outline')} ${cx(homeStyles, 'btn', 'btn-outline')}`}>
              <i className="fas fa-info-circle" /> Learn More
            </Link>
          </div>
        </div>

        <HeroImage />
      </div>

      <div className={authStyles['scroll-indicator']}>
        <div className={authStyles['mouse']}>
          <div className={authStyles['wheel']} />
        </div>
        <p>Explore More</p>
      </div>
    </div>
  );
}
