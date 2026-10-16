'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';
import { useWords, useUpdateWord, useDeleteWord, useDeleteAllWords } from '@/hooks/use-words';
import { usePackage } from '@/hooks/use-packages';
import type { Word, UpdateWordPayload } from '@/hooks/use-words';
import { getApiErrorMessage } from '@/lib/api-error';
import toast from 'react-hot-toast';
import { DeleteAllModal, type DeleteAllStatus } from '@/components/words/DeleteAllModal';
import { WordRow } from '@/components/words/WordRow';
import { matchesSearch } from '@/components/words/word-search';
import styles from '@/styles/vocabs.module.css';
import { cx } from '@/lib/css-module';

const LEVELS = ['x', 'level_0', 'level_1', 'level_2', 'v'] as const;

function levelLabel(level: string): string {
  if (level === 'x') return 'x';
  if (level === 'v') return 'v';
  return level.replace('level_', '');
}

/* ═══════════════════════════ */
/* MAIN WORDS PAGE             */
/* ═══════════════════════════ */
function WordsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = Number(searchParams.get('package'));

  const pkgQuery = usePackage(packageId || null);
  const wordsQuery = useWords(packageId || null);
  const words = wordsQuery.data;
  const isOwner = pkgQuery.data?.isOwner ?? false;
  const updateWord = useUpdateWord(packageId);
  const deleteWord = useDeleteWord(packageId);
  const deleteAll = useDeleteAllWords(packageId);

  const [search, setSearch] = useState('');
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllStatus, setDeleteAllStatus] = useState<DeleteAllStatus>('idle');
  const [deletingLevels, setDeletingLevels] = useState<Set<string>>(new Set());
  const addWordsHref = `/words/add?package=${packageId}`;

  // Group words by level
  const wordsByLevel = useMemo(() => {
    if (!words) return {};
    let filtered = words;
    const term = search.trim().toLowerCase();
    if (term) {
      filtered = words.filter((w) => matchesSearch(w, term));
    }
    const grouped: Record<string, Word[]> = {};
    for (const level of LEVELS) {
      const levelWords = filtered.filter((w) => w.level === level);
      if (levelWords.length > 0) {
        grouped[level] = levelWords;
      }
    }
    return grouped;
  }, [words, search]);

  const handleUpdateWord = useCallback(
    (detailId: number, dto: UpdateWordPayload) => {
      updateWord.mutate(
        { detailId, dto },
        {
          onSuccess: () => toast.success('Mot modifié avec succès'),
          onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
        },
      );
    },
    [updateWord],
  );

  const handleDeleteWord = useCallback(
    (detailId: number) => {
      deleteWord.mutate(detailId, {
        onSuccess: () => toast.success('Mot supprimé'),
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
      });
    },
    [deleteWord],
  );

  const handleDeleteAll = useCallback(() => {
    setDeleteAllStatus('loading');
    deleteAll.mutate(undefined, {
      onSuccess: (data: { message: string }) => {
        setDeleteAllStatus('success');
        setTimeout(() => {
          setDeleteAllOpen(false);
          setDeleteAllStatus('idle');

          // Staggered fade-out of the level containers, then refetch, as in the old app
          const levels = Object.keys(wordsByLevel);
          levels.forEach((level, i) => {
            setTimeout(() => setDeletingLevels((prev) => new Set(prev).add(level)), i * 100);
          });
          setTimeout(() => {
            void wordsQuery.refetch().then(() => setDeletingLevels(new Set()));
            toast.success(data.message);
          }, levels.length * 100 + 600);
        }, 1500);
      },
      onError: (err) => {
        setDeleteAllStatus('idle');
        toast.error(
          getApiErrorMessage(err, 'Une erreur est survenue lors de la suppression des mots'),
        );
      },
    });
  }, [deleteAll, wordsByLevel, wordsQuery]);

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

  const hasWords = words && words.length > 0;
  const levelEntries = Object.entries(wordsByLevel);

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
        <div className={cx(styles, 'action-container')}>
          <Link href={addWordsHref} className={cx(styles, 'add-word-btn')}>
            <i className="fas fa-plus"></i> Ajouter un nouveau mot
          </Link>
          <button
            className={cx(styles, 'learn-btn')}
            onClick={() => router.push(`/learn?package=${packageId}`)}
          >
            <i className="fas fa-book-open"></i> Mode d&apos;apprentissage
          </button>
          {hasWords && (
            <button className={cx(styles, 'btn-danger')} onClick={() => setDeleteAllOpen(true)}>
              <i className="fas fa-trash"></i> Supprimer tous les mots
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className={cx(styles, 'search-container')}>
        <div className={cx(styles, 'search-form')}>
          <div className={cx(styles, 'input-group')}>
            <input
              type="text"
              placeholder="Tapez pour rechercher un mot..."
              className={cx(styles, 'search-input')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className={cx(styles, 'search-btn')}>
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>

      {search && (
        <div className={cx(styles, 'search-results-info')} style={{ display: 'block' }}>
          <p>
            <span>{levelEntries.reduce((s, [, ws]) => s + ws.length, 0)}</span> résultat(s) pour{' '}
            <strong>{search}</strong>
          </p>
        </div>
      )}

      {hasWords ? (
        levelEntries.length > 0 ? (
          levelEntries.map(([level, levelWords]) => (
            <div key={level} className={cx(styles, 'level-container', deletingLevels.has(level) && 'level-deleting')} data-level={level}>
              <div className={cx(styles, 'level-header')}>
                <span>Niveau {levelLabel(level)}</span>
                <span className={cx(styles, 'level-badge')}>{levelWords.length} mot(s)</span>
              </div>
              <table className={cx(styles, 'words-table')}>
                <thead>
                  <tr>
                    <th>Mot</th>
                    <th>Langue</th>
                    <th>Type</th>
                    <th>Meaning</th>
                    <th>Prononciation</th>
                    <th>Synonymes</th>
                    <th>Antonymes</th>
                    <th>Exemple</th>
                    <th>Grammaire</th>
                    {isOwner && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {levelWords.map((w) => (
                    <WordRow
                      key={w.detail_id}
                      w={w}
                      onSave={handleUpdateWord}
                      onDelete={handleDeleteWord}
                      savePending={updateWord.isPending}
                      readOnly={!isOwner}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          <div className={cx(styles, 'no-words')}>
            <i className="fas fa-search"></i>
            <h3>Aucun résultat</h3>
            <p>Aucun mot ne correspond à votre recherche.</p>
          </div>
        )
      ) : (
        <div className={cx(styles, 'no-words')}>
          <i className="fas fa-book"></i>
          {isOwner ? (
            <>
              <h3>Aucun mot dans votre vocabulaire</h3>
              <p>Commencez à ajouter des mots pour enrichir votre vocabulaire.</p>
              <Link href={addWordsHref} className={cx(styles, 'btn')}>
                Ajouter votre premier mot
              </Link>
            </>
          ) : (
            <h3>Aucun mot dans ce package</h3>
          )}
        </div>
      )}

      <div className={cx(styles, 'home-cta')} style={{ marginTop: 40 }}>
        <button className={cx(styles, 'btn')} onClick={() => router.push('/packages')}>
          Retour aux packages
        </button>
      </div>

      {/* Modals */}
      <DeleteAllModal
        open={deleteAllOpen}
        status={deleteAllStatus}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={handleDeleteAll}
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
