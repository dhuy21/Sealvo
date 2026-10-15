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
import toast from 'react-hot-toast';

const WORD_TYPES = [
  { value: 'noun', label: 'Nom' },
  { value: 'verb', label: 'Verbe' },
  { value: 'adjective', label: 'Adjectif' },
  { value: 'adverb', label: 'Adverbe' },
  { value: 'ph_v', label: 'Ph.V' },
  { value: 'idiom', label: 'Idiom' },
  { value: 'collocation', label: 'Colloc' },
];

const LEVELS = ['x', 'level_0', 'level_1', 'level_2', 'v'] as const;

function levelLabel(level: string): string {
  if (level === 'x') return 'x';
  if (level === 'v') return 'v';
  return level.replace('level_', '');
}

/* ─── Add Word Modal ─── */
function AddWordModal({
  open,
  onClose,
  onSubmit,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWordPayload) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CreateWordPayload>({
    word: '',
    language_code: '',
    subject: 'Daily',
    type: 'noun',
    meaning: '',
    pronunciation: '',
    synonyms: '',
    antonyms: '',
    example: '',
    grammar: '',
  });

  if (!open) return null;

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            <i className="fas fa-plus-circle"></i> Ajouter un mot
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
            setForm({
              word: '',
              language_code: '',
              subject: 'Daily',
              type: 'noun',
              meaning: '',
              pronunciation: '',
              synonyms: '',
              antonyms: '',
              example: '',
              grammar: '',
            });
          }}
        >
          <div className="modal-body">
            <div className="form-group">
              <label>
                <i className="fas fa-font"></i> Mot
              </label>
              <input
                className="form-input"
                value={form.word}
                onChange={(e) => handleChange('word', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-globe"></i> Langue
              </label>
              <input
                className="form-input"
                placeholder="en, fr, de..."
                value={form.language_code}
                onChange={(e) => handleChange('language_code', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-tag"></i> Sujet
              </label>
              <input
                className="form-input"
                value={form.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-list"></i> Type
              </label>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                {WORD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-book"></i> Signification
              </label>
              <input
                className="form-input"
                value={form.meaning}
                onChange={(e) => handleChange('meaning', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Prononciation</label>
              <input
                className="form-input"
                value={form.pronunciation}
                onChange={(e) => handleChange('pronunciation', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Synonymes</label>
              <input
                className="form-input"
                value={form.synonyms}
                onChange={(e) => handleChange('synonyms', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Antonymes</label>
              <input
                className="form-input"
                value={form.antonyms}
                onChange={(e) => handleChange('antonyms', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Exemple</label>
              <input
                className="form-input"
                value={form.example}
                onChange={(e) => handleChange('example', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Grammaire</label>
              <input
                className="form-input"
                value={form.grammar}
                onChange={(e) => handleChange('grammar', e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="fas fa-times"></i> Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}{' '}
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete All Modal ─── */
function DeleteAllModal({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content modal-danger">
        <div className="modal-header">
          <h3>
            <i className="fas fa-exclamation-triangle"></i> Supprimer tous les mots
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <p>Êtes-vous sûr de vouloir supprimer <strong>tous les mots</strong> de ce package ?</p>
          <p className="warning-text">
            <i className="fas fa-warning"></i> Cette action est irréversible.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}{' '}
            Supprimer tout
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Editable Word Row ─── */
function WordRow({
  w,
  onSave,
  onDelete,
  savePending,
}: {
  w: Word;
  onSave: (detailId: number, dto: UpdateWordPayload) => void;
  onDelete: (detailId: number) => void;
  savePending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    word: w.word,
    language_code: w.language_code,
    type: w.type,
    meaning: w.meaning,
    pronunciation: w.pronunciation ?? '',
    synonyms: w.synonyms ?? '',
    antonyms: w.antonyms ?? '',
    example: w.example ?? '',
    grammar: w.grammar ?? '',
  });

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (editing) {
    return (
      <tr>
        <td className="table-cell">
          <div className="table-cell-content">
            <input
              className="edit-input"
              value={form.word}
              onChange={(e) => handleChange('word', e.target.value)}
              required
            />
          </div>
        </td>
        <td className="table-cell">
          <div className="table-cell-content">
            <input
              className="edit-input"
              value={form.language_code}
              onChange={(e) => handleChange('language_code', e.target.value)}
              required
            />
          </div>
        </td>
        <td className="table-cell">
          <div className="table-cell-content">
            <select
              className="edit-input"
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              {WORD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </td>
        <td className="table-cell">
          <div className="table-cell-content">
            <input
              className="edit-input"
              value={form.meaning}
              onChange={(e) => handleChange('meaning', e.target.value)}
              required
            />
          </div>
        </td>
        <td className="table-cell">
          <div className="table-cell-content">
            <input
              className="edit-input"
              value={form.pronunciation}
              onChange={(e) => handleChange('pronunciation', e.target.value)}
            />
          </div>
        </td>
        <td className="table-cell">
          <div className="table-cell-content">
            <input
              className="edit-input"
              value={form.synonyms}
              onChange={(e) => handleChange('synonyms', e.target.value)}
            />
          </div>
        </td>
        <td className="table-cell">
          <div className="table-cell-content">
            <input
              className="edit-input"
              value={form.antonyms}
              onChange={(e) => handleChange('antonyms', e.target.value)}
            />
          </div>
        </td>
        <td className="table-cell">
          <div className="table-cell-content">
            <input
              className="edit-input"
              value={form.example}
              onChange={(e) => handleChange('example', e.target.value)}
            />
          </div>
        </td>
        <td className="table-cell">
          <div className="table-cell-content">
            <input
              className="edit-input"
              value={form.grammar}
              onChange={(e) => handleChange('grammar', e.target.value)}
            />
          </div>
        </td>
        <td className="table-cell">
          <div className="action-buttons">
            <button
              className="save-btn"
              title="Valider"
              disabled={savePending}
              onClick={() => {
                onSave(w.detail_id, form);
                setEditing(false);
              }}
            >
              <i className={savePending ? 'fas fa-spinner fa-spin' : 'fas fa-check'}></i>
            </button>
            <button className="cancel-btn" title="Annuler" onClick={() => setEditing(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="table-cell">
        <div className="table-cell-content">{w.word}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.language_code}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.type}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.meaning}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.pronunciation}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.synonyms}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.antonyms}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.example}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.grammar}</div>
      </td>
      <td className="table-cell">
        <div className="action-buttons">
          <button className="edit-btn" title="Modifier" onClick={() => setEditing(true)}>
            <i className="fas fa-edit"></i>
          </button>
          <button className="delete-btn" title="Supprimer" onClick={() => onDelete(w.detail_id)}>
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  );
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
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
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
          onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
        },
      );
    },
    [updateWord],
  );

  const handleDeleteWord = useCallback(
    (detailId: number) => {
      deleteWord.mutate(detailId, {
        onSuccess: () => toast.success('Mot supprimé'),
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
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
      onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
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
