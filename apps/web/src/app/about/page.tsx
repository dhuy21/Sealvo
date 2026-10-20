import type { Metadata } from 'next';
import Link from 'next/link';
import { SocialClock } from '@/components/about/SocialClock';
import styles from '@/styles/aboutme.module.css';

export const metadata: Metadata = { title: 'À propos de moi' };

export default function AboutPage() {
  return (
    <div className={styles['container']}>
      <h1>À propos de moi</h1>

      {/* Section Profil */}
      <section className={styles['profile-section']}>
        <div className={styles['profile-container']}>
          <div className={styles['profile-image']}>
            <img src="/images/moi.jpg" alt="Photo de profil" />
          </div>
          <div className={styles['profile-info']}>
            <h2 className={styles['profile-name']}>NGUYEN Dinh Huy</h2>
            <p>Développeur Web | Designer | Étudiant</p>
            <p>
              Je suis passionné par le développement web et la création d&apos;applications modernes
              et conviviales. Mon objectif est de combiner créativité et fonctionnalité pour créer
              des expériences utilisateur exceptionnelles.
            </p>
          </div>
        </div>
      </section>

      {/* Section Compétences */}
      <section className={styles['skills-section']}>
        <h2 className={styles['section-title']}>Mes compétences</h2>
        <div className={styles['skills-grid']}>
          <div className={styles['skill-card']}>
            <i className="fas fa-code" />
            <h3>Développement Front-End</h3>
            <p>HTML, CSS, JavaScript, React, Vue.js</p>
          </div>
          <div className={styles['skill-card']}>
            <i className="fas fa-server" />
            <h3>Développement Back-End</h3>
            <p>Node.js, Express, PHP, MySQL</p>
          </div>
          <div className={styles['skill-card']}>
            <i className="fas fa-paint-brush" />
            <h3>Design</h3>
            <p>UI/UX, Canva</p>
          </div>
        </div>
      </section>

      {/* Section Parcours */}
      <section className={styles['timeline-section']}>
        <h2 className={styles['section-title']}>Mon parcours</h2>
        <div className={styles['timeline-item']}>
          <div className={styles['timeline-header']}>
            <i className="fas fa-graduation-cap" />
            <h3>Formation</h3>
          </div>
          <div className={styles['timeline-content']}>
            <div className={styles['timeline-entry']}>
              <h4>Diplôme d&apos;Ingénieur en Sécurité Informatique</h4>
              <p>INSA Centre Val de Loire, site de Bourges | 2022 - maintenant</p>
            </div>
            <div className={styles['timeline-entry']}>
              <h4>Baccalauréat général</h4>
              <p>Lycée d&apos;excellence LE Quy Don au Viet Nam, option Physique | 2019 - 2022</p>
            </div>
          </div>
        </div>
        <div className={styles['timeline-item']}>
          <div className={styles['timeline-header']}>
            <i className="fas fa-briefcase" />
          </div>
          <div className={styles['timeline-content']}>
            <div className={styles['timeline-entry']} />
            <div className={styles['timeline-entry']} />
          </div>
        </div>
      </section>

      {/* Section Contact */}
      <section className={styles['contact-section']}>
        <h2 className={styles['section-title']}>Contact</h2>
        <div className={styles['contact-links']}>
          <a href="mailto:huynguyen2182004@gmail.com" className={styles['contact-link']}>
            <i className="fas fa-envelope" />
            <span>huynguyen2182004@gmail.com</span>
          </a>
          <a href="tel:+3367254326" className={styles['contact-link']}>
            <i className="fas fa-phone" />
            <span>+33 67 25 43 26</span>
          </a>
          <a
            href="https://linkedin.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles['contact-link']}
          >
            <i className="fab fa-linkedin" />
            <span>LinkedIn</span>
          </a>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles['contact-link']}
          >
            <i className="fab fa-github" />
            <span>GitHub</span>
          </a>
        </div>

        <SocialClock />
      </section>

      {/* Bouton de retour */}
      <div className={styles['about-home-cta']}>
        <Link href="/" className={styles['about-home-btn']}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
