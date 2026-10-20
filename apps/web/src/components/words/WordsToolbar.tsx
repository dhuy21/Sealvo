'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '@/styles/vocabs.module.css';
import { cx } from '@/lib/css-module';

/** Owner actions of the words page. */
export function WordsToolbar({
  packageId,
  hasWords,
  onDeleteAll,
}: {
  packageId: number;
  hasWords: boolean;
  onDeleteAll: () => void;
}) {
  const router = useRouter();

  return (
    <div className={cx(styles, 'action-container')}>
      <Link href={`/words/add?package=${packageId}`} className={cx(styles, 'add-word-btn')}>
        <i className="fas fa-plus"></i> Ajouter un nouveau mot
      </Link>
      <button
        className={cx(styles, 'learn-btn')}
        onClick={() => router.push(`/learn?package=${packageId}`)}
      >
        <i className="fas fa-book-open"></i> Mode d&apos;apprentissage
      </button>
      {hasWords && (
        <button className={cx(styles, 'btn-danger')} onClick={onDeleteAll}>
          <i className="fas fa-trash"></i> Supprimer tous les mots
        </button>
      )}
    </div>
  );
}
