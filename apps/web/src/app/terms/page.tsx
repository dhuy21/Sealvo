import Link from 'next/link';

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Conditions d&apos;utilisation
      </h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          1. Acceptation des conditions
        </h2>
        <p>
          En utilisant SealVo, vous acceptez les présentes conditions d&apos;utilisation. Si vous
          n&apos;acceptez pas ces conditions, veuillez ne pas utiliser le service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          2. Description du service
        </h2>
        <p>
          SealVo est une application web d&apos;apprentissage de vocabulaire en 18 langues,
          utilisant la répétition espacée et des mini-jeux interactifs.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          3. Compte utilisateur
        </h2>
        <p>
          Vous êtes responsable de la confidentialité de votre mot de passe et de toutes les
          activités effectuées sous votre compte.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          4. Propriété intellectuelle
        </h2>
        <p>
          Le contenu de SealVo (code, design, textes) est protégé par le droit d&apos;auteur. Les
          packages de vocabulaire créés par les utilisateurs leur appartiennent.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          5. Protection des données
        </h2>
        <p>
          Vos données personnelles sont traitées conformément au RGPD. Nous ne partageons pas vos
          données avec des tiers sans votre consentement.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>6. Contact</h2>
        <p>
          Pour toute question, contactez-nous via la page{' '}
          <Link href="/feedback" style={{ color: 'var(--primary-color, #6a11cb)' }}>
            Feedback
          </Link>
          .
        </p>
      </section>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/register" style={{ color: 'var(--primary-color, #6a11cb)' }}>
          ← Retour à l&apos;inscription
        </Link>
      </div>
    </div>
  );
}
