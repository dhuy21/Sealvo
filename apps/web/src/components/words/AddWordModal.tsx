'use client';

import { useState } from 'react';
import type { CreateWordPayload } from '@/hooks/use-words';
import { WORD_TYPES } from './constants';

export function AddWordModal({
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
