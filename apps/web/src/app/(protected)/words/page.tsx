'use client';

import { Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';
import {
  useWords,
  useAddWord,
  useUpdateWord,
  useDeleteWord,
  useDeleteAllWords,
} from '@/hooks/use-words';
import { useImportFile } from '@/hooks/use-import';
import type { Word, CreateWordPayload, UpdateWordPayload } from '@/hooks/use-words';
import { getApiErrorMessage } from '@/lib/api-error';
import toast from 'react-hot-toast';
import { AddWordModal } from '@/components/words/AddWordModal';
import { DeleteAllModal } from '@/components/words/DeleteAllModal';
import { WordRow } from '@/components/words/WordRow';

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

  const { data: words, isLoading } = useWords(packageId || null);
  const addWord = useAddWord(packageId);
  const updateWord = useUpdateWord(packageId);
  const deleteWord = useDeleteWord(packageId);
  const deleteAll = useDeleteAllWords(packageId);
  const importFile = useImportFile(packageId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  // Group words by level
  const wordsByLevel = useMemo(() => {
    if (!words) return {};
    let filtered = words;
    if (search) {
      const term = search.toLowerCase();
      filtered = words.filter(
        (w) =>
          w.word.toLowerCase().includes(term) ||
          w.meaning.toLowerCase().includes(term) ||
          (w.synonyms ?? '').toLowerCase().includes(term),
      );
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

  const handleAddWord = useCallback(
    (data: CreateWordPayload) => {
      addWord.mutate(data, {
        onSuccess: () => {
          toast.success('Mot ajouté avec succès');
          setAddModalOpen(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
      });
    },
    [addWord],
  );

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
    deleteAll.mutate(undefined, {
      onSuccess: () => {
        toast.success('Tous les mots ont été supprimés');
        setDeleteAllOpen(false);
      },
      onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
    });
  }, [deleteAll]);

  if (!packageId) {
    return (
      <div className="vocabulary-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Aucun package sélectionné.</p>
        <button className="btn" onClick={() => router.push('/packages')}>
          Retour aux packages
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="vocabulary-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  const hasWords = words && words.length > 0;
  const levelEntries = Object.entries(wordsByLevel);

  return (
    <div className="vocabulary-container" data-package={packageId}>
      <h1>Mon Vocabulaire</h1>

      <div className="action-container">
        <button className="add-word-btn" onClick={() => setAddModalOpen(true)}>
          <i className="fas fa-plus"></i> Ajouter un nouveau mot
        </button>
        <button
          className="learn-btn"
          onClick={() => router.push(`/learn?package=${packageId}`)}
        >
          <i className="fas fa-book-open"></i> Mode d&apos;apprentissage
        </button>
        <button
          className="add-word-btn"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={importFile.uploading}
        >
          {importFile.uploading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-file-import"></i>
          )}{' '}
          Importer (Excel)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              importFile.upload(file);
              e.target.value = '';
            }
          }}
        />
        {hasWords && (
          <button className="btn-danger" onClick={() => setDeleteAllOpen(true)}>
            <i className="fas fa-trash"></i> Supprimer tous les mots
          </button>
        )}
      </div>

      {/* Import Progress */}
      {importFile.job && (
        <div
          className="alert"
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            background:
              importFile.job.status === 'completed'
                ? '#d1fae5'
                : importFile.job.status === 'failed'
                  ? '#fee2e2'
                  : '#dbeafe',
          }}
        >
          {importFile.job.status === 'pending' && (
            <p>
              <i className="fas fa-clock"></i> Import en attente...
            </p>
          )}
          {importFile.job.status === 'processing' && (
            <p>
              <i className="fas fa-spinner fa-spin"></i> Import en cours...
              {importFile.job.progress !== undefined &&
                importFile.job.total !== undefined &&
                ` (${importFile.job.progress}/${importFile.job.total})`}
            </p>
          )}
          {importFile.job.status === 'completed' && (
            <p>
              <i className="fas fa-check-circle" style={{ color: '#059669' }}></i>{' '}
              {importFile.job.message ?? 'Import terminé avec succès'}
              <button
                style={{
                  marginLeft: '1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
                onClick={importFile.reset}
              >
                <i className="fas fa-times"></i>
              </button>
            </p>
          )}
          {importFile.job.status === 'failed' && (
            <p>
              <i className="fas fa-exclamation-circle" style={{ color: '#dc2626' }}></i>{' '}
              {importFile.job.error ?? "Erreur lors de l'import"}
              <button
                style={{
                  marginLeft: '1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
                onClick={importFile.reset}
              >
                <i className="fas fa-times"></i>
              </button>
            </p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="search-container">
        <div className="search-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Tapez pour rechercher un mot..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className="search-btn">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>

      {search && (
        <div className="search-results-info" style={{ display: 'block' }}>
          <p>
            <span>{levelEntries.reduce((s, [, ws]) => s + ws.length, 0)}</span> résultat(s) pour{' '}
            <strong>{search}</strong>
          </p>
        </div>
      )}

      {hasWords ? (
        levelEntries.length > 0 ? (
          levelEntries.map(([level, levelWords]) => (
            <div key={level} className="level-container" data-level={level}>
              <div className="level-header">
                <span>Niveau {levelLabel(level)}</span>
                <span className="level-badge">{levelWords.length} mot(s)</span>
              </div>
              <table className="words-table">
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
                    <th>Actions</th>
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
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          <div className="no-words">
            <i className="fas fa-search"></i>
            <h3>Aucun résultat</h3>
            <p>Aucun mot ne correspond à votre recherche.</p>
          </div>
        )
      ) : (
        <div className="no-words">
          <i className="fas fa-book"></i>
          <h3>Aucun mot dans votre vocabulaire</h3>
          <p>Commencez à ajouter des mots pour enrichir votre vocabulaire.</p>
          <button className="btn" onClick={() => setAddModalOpen(true)}>
            Ajouter votre premier mot
          </button>
        </div>
      )}

      <div className="home-cta" style={{ marginTop: 40 }}>
        <button className="btn" onClick={() => router.push('/packages')}>
          Retour aux packages
        </button>
      </div>

      {/* Modals */}
      <AddWordModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddWord}
        saving={addWord.isPending}
      />
      <DeleteAllModal
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={handleDeleteAll}
        saving={deleteAll.isPending}
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
