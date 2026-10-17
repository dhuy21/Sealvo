'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWords } from '@/hooks/use-words';
import { usePackage } from '@/hooks/use-packages';
import { getApiErrorMessage } from '@/lib/api-error';
import { DeleteAllModal } from '@/components/words/DeleteAllModal';
import { WordsToolbar } from '@/components/words/WordsToolbar';
import { WordsSearch } from '@/components/words/WordsSearch';
import { WordsLevelTable } from '@/components/words/WordsLevelTable';
import { WordsEmptyState } from '@/components/words/WordsEmptyState';
import { useWordsByLevel } from '@/components/words/use-words-by-level';
import { useWordActions } from '@/components/words/use-word-actions';
import { useDeleteAllFlow } from '@/components/words/use-delete-all-flow';
import styles from '@/styles/vocabs.module.css';
import { cx } from '@/lib/css-module';

function WordsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = Number(searchParams.get('package'));

  const pkgQuery = usePackage(packageId || null);
  const wordsQuery = useWords(packageId || null);
  const words = wordsQuery.data;
  const isOwner = pkgQuery.data?.isOwner ?? false;

  const [search, setSearch] = useState('');
  const levelEntries = useWordsByLevel(words, search);
  const wordActions = useWordActions(packageId);
  const deleteAll = useDeleteAllFlow(packageId, levelEntries.map(([level]) => level));

  if (!packageId) {
    return (
      <div className={cx(styles, 'vocabulary-container')} style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Aucun package sélectionné.</p>
        <button className={cx(styles, 'btn')} onClick={() => router.push('/packages')}>
          Retour aux packages
        </button>
      </div>
    );
  }

  if (pkgQuery.isLoading || wordsQuery.isLoading) {
    return (
      <div className={cx(styles, 'vocabulary-container')} style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (pkgQuery.isError || wordsQuery.isError) {
    return (
      <div className={cx(styles, 'vocabulary-container')} style={{ textAlign: 'center', padding: '4rem' }}>
        <div className={cx(styles, 'no-words')}>
          <i className="fas fa-exclamation-circle"></i>
          <h3>Package inaccessible</h3>
          <p>
            {getApiErrorMessage(
              pkgQuery.error ?? wordsQuery.error,
              "Ce package n'existe pas ou vous n'avez pas l'autorisation de le consulter.",
            )}
          </p>
        </div>
        <button className={cx(styles, 'btn')} onClick={() => router.push('/packages')}>
          Retour aux packages
        </button>
      </div>
    );
  }

  const hasWords = !!words && words.length > 0;

  return (
    <div className={cx(styles, 'vocabulary-container')} data-package={packageId}>
      <h1>{pkgQuery.data?.package_name ?? 'Mon Vocabulaire'}</h1>

      {!isOwner && pkgQuery.data && (
        <div className={cx(styles, 'search-results-info')} style={{ display: 'block' }}>
          <p>
            <i className="fas fa-eye"></i> Lecture seule — package de{' '}
            <strong>{pkgQuery.data.username}</strong>
          </p>
        </div>
      )}

      {isOwner && (
        <WordsToolbar packageId={packageId} hasWords={hasWords} onDeleteAll={deleteAll.openModal} />
      )}

      <WordsSearch
        search={search}
        onSearchChange={setSearch}
        resultCount={levelEntries.reduce((s, [, ws]) => s + ws.length, 0)}
      />

      {!hasWords ? (
        <WordsEmptyState packageId={packageId} isOwner={isOwner} />
      ) : levelEntries.length > 0 ? (
        levelEntries.map(([level, levelWords]) => (
          <WordsLevelTable
            key={level}
            level={level}
            words={levelWords}
            isOwner={isOwner}
            deleting={deleteAll.deletingLevels.has(level)}
            onSave={wordActions.saveWord}
            onDelete={wordActions.removeWord}
          />
        ))
      ) : (
        <div className={cx(styles, 'no-words')}>
          <i className="fas fa-search"></i>
          <h3>Aucun résultat</h3>
          <p>Aucun mot ne correspond à votre recherche.</p>
        </div>
      )}

      <div className={cx(styles, 'home-cta')} style={{ marginTop: 40 }}>
        <button className={cx(styles, 'btn')} onClick={() => router.push('/packages')}>
          Retour aux packages
        </button>
      </div>

      {/* Modals */}
      <DeleteAllModal
        open={deleteAll.open}
        status={deleteAll.status}
        onClose={deleteAll.closeModal}
        onConfirm={deleteAll.confirm}
      />
    </div>
  );
}

export default function WordsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
        </div>
      }
    >
      <WordsContent />
    </Suspense>
  );
}
