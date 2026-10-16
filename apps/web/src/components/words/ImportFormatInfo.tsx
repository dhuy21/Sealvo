import styles from '@/styles/add-word.module.css';
import { cx } from '@/lib/css-module';

/** Expected spreadsheet columns, sample file and import tips. */
export function ImportFormatInfo() {
  return (
    <div className={cx(styles, 'format-info')}>
      <p>
        <strong>Format requis pour Excel:</strong> Les colonnes doivent être dans l&apos;ordre: Mot,
        Langue, Sujet, Type, Prononciation, Signification, Exemple, Synonymes, Antonymes, Grammaire,
        Niveau
      </p>
      <p>
        <a href="/data/example-vocab.xlsx" download className={cx(styles, 'example-link')}>
          Télécharger un fichier XLSX d&apos;exemple
        </a>
      </p>
      <details className={cx(styles, 'import-help')}>
        <summary>Aide pour l&apos;importation</summary>
        <div className={cx(styles, 'help-content')}>
          <p>Pour que l&apos;importation fonctionne correctement:</p>
          <ol>
            <li>Créez un fichier Excel avec les colonnes dans le bon ordre</li>
            <li>
              Assurez-vous que chaque ligne contient au moins: Mot, Sujet, Langue, Type, Signification
            </li>
            <li>
              Pour le type, utilisez uniquement: noun, verb, adjective, adverb, ph.v, idiom,
              collocation
            </li>
            <li>
              Pour le niveau, utilisez <strong>uniquement les chiffres</strong> x, 0, 1, 2 ou v (pas
              de texte comme &quot;Niveau 1&quot;)
            </li>
            <li>Limitez la taille du fichier à moins de 5 Mo</li>
          </ol>
          <p>Si vous rencontrez des erreurs, vérifiez ces points et réessayez.</p>
        </div>
      </details>
    </div>
  );
}
