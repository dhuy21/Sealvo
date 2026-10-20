import Link from 'next/link';
import styles from '@/styles/vocabs.module.css';
import { cx } from '@/lib/css-module';

export function WordsEmptyState({
  packageId,
  isOwner,
  narrow = false,
}: {
  packageId: number;
  isOwner: boolean;
  narrow?: boolean;
}) {
  return (
    <div className={cx(styles, 'no-words', narrow && 'no-words-narrow')}>
      <i className="fas fa-book"></i>
      {isOwner ? (
        <>
          <h3>Aucun mot dans votre vocabulaire</h3>
          <p>Commencez à ajouter des mots pour enrichir votre vocabulaire.</p>
          <Link href={`/words/add?package=${packageId}`} className={cx(styles, 'btn')}>
            Ajouter votre premier mot
          </Link>
        </>
      ) : (
        <h3>Aucun mot dans ce package</h3>
      )}
    </div>
  );
}
