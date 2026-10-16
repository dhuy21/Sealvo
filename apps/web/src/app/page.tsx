import type { Metadata } from 'next';
import { HeroSection } from '@/components/home/HeroSection';
import { StatsSection } from '@/components/home/StatsSection';
import { ShowcaseSection } from '@/components/home/ShowcaseSection';
import { CtaSection } from '@/components/home/CtaSection';
import { MouseGlow } from '@/components/home/MouseGlow';
import authStyles from '@/styles/auth.module.css';
import homeStyles from '@/styles/home.module.css';

// The root layout's title template does not apply to a page in the same segment
export const metadata: Metadata = { title: { absolute: 'Accueil | SealVo' } };

export default function HomePage() {
  return (
    <div className={`${authStyles['page']} ${homeStyles['home-page']}`}>
      <HeroSection />
      <StatsSection />
      <ShowcaseSection />
      <CtaSection />
      <MouseGlow />
    </div>
  );
}
