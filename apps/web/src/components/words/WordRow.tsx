'use client';

import { useState } from 'react';
import type { Word, UpdateWordPayload } from '@/hooks/use-words';
import { WORD_TYPES, stripBoldMarkup, wordTypeLabel } from './constants';

export function WordRow({
  w,
  onSave,
  onDelete,
  savePending,
  readOnly = false,
}: {
  w: Word;
  onSave: (detailId: number, dto: UpdateWordPayload) => void;
  onDelete: (detailId: number) => void;
  savePending: boolean;
  readOnly?: boolean;
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
        <div className="table-cell-content">{wordTypeLabel(w.type)}</div>
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
        <div className="table-cell-content">{w.example && stripBoldMarkup(w.example)}</div>
      </td>
      <td className="table-cell">
        <div className="table-cell-content">{w.grammar}</div>
      </td>
      {!readOnly && (
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
      )}
    </tr>
  );
}
