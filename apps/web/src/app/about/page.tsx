import '@/styles/aboutme.css';

export default function AboutPage() {
  return (
    <div className="container">
      <h1>À propos de moi</h1>

      {/* Section Profil */}
      <section className="profile-section">
        <div className="profile-container">
          <div className="profile-image">
            <img src="/images/moi.jpg" alt="Photo de profil" />
          </div>
          <div className="profile-info">
            <h2 className="profile-name">NGUYEN Dinh Huy</h2>
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
      <section className="skills-section">
        <h2 className="section-title">Mes compétences</h2>
        <div className="skills-grid">
          <div className="skill-card">
            <i className="fas fa-code" />
            <h3>Développement Front-End</h3>
            <p>HTML, CSS, JavaScript, React, Vue.js</p>
          </div>
          <div className="skill-card">
            <i className="fas fa-server" />
            <h3>Développement Back-End</h3>
            <p>Node.js, Express, PHP, MySQL</p>
          </div>
          <div className="skill-card">
            <i className="fas fa-paint-brush" />
            <h3>Design</h3>
            <p>UI/UX, Canva</p>
          </div>
        </div>
      </section>

      {/* Section Parcours */}
      <section className="timeline-section">
        <h2 className="section-title">Mon parcours</h2>
        <div className="timeline-item">
          <div className="timeline-header">
            <i className="fas fa-graduation-cap" />
            <h3>Formation</h3>
          </div>
          <div className="timeline-content">
            <div className="timeline-entry">
              <h4>Diplôme d&apos;Ingénieur en Sécurité Informatique</h4>
              <p>INSA Centre Val de Loire, site de Bourges | 2022 - maintenant</p>
            </div>
            <div className="timeline-entry">
              <h4>Baccalauréat général</h4>
              <p>Lycée d&apos;excellence LE Quy Don au Viet Nam, option Physique | 2019 - 2022</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Contact */}
      <section className="contact-section">
        <h2 className="section-title">Contact</h2>
        <div className="contact-links">
          <a href="mailto:huynguyen2182004@gmail.com" className="contact-link">
            <i className="fas fa-envelope" />
            <span>huynguyen2182004@gmail.com</span>
          </a>
          <a href="tel:+3367254326" className="contact-link">
            <i className="fas fa-phone" />
            <span>+33 67 25 43 26</span>
          </a>
          <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="contact-link">
            <i className="fab fa-linkedin" />
            <span>LinkedIn</span>
          </a>
          <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="contact-link">
            <i className="fab fa-github" />
            <span>GitHub</span>
          </a>
        </div>
      </section>
    </div>
  );
}
