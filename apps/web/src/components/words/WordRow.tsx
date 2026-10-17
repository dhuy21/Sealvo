'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { VALID_LANGS } from '@sealvo/shared';
import type { Word, UpdateWordPayload } from '@/hooks/use-words';
import { stripBoldMarkup } from '@/lib/bold-markup';
import { WORD_TYPE_OPTIONS, wordTypeLabel } from './constants';
import { REQUIRED_FIELDS_MESSAGE, toUpdatePayload, wordEditForm, type WordEditForm } from './word-edit-form';
import styles from '@/styles/vocabs.module.css';
import { cx } from '@/lib/css-module';

export function WordRow({
  w,
  onSave,
  onDelete,
  readOnly = false,
}: {
  w: Word;
  /** Resolves to `true` once saved; the editor stays open otherwise. */
  onSave: (detailId: number, dto: UpdateWordPayload) => Promise<boolean>;
  onDelete: (detailId: number) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => wordEditForm(w));

  const handleChange = (field: keyof WordEditForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const startEditing = () => {
    setForm(wordEditForm(w));
    setEditing(true);
  };

  const save = async () => {
    const dto = toUpdatePayload(form);
    if (!dto) {
      toast.error(REQUIRED_FIELDS_MESSAGE);
      return;
    }
    setSaving(true);
    const saved = await onSave(w.detail_id, dto);
    setSaving(false);
    if (saved) setEditing(false);
  };

  if (editing) {
    return (
      <tr>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <input
              className={cx(styles, 'edit-input')}
              value={form.word}
              onChange={(e) => handleChange('word', e.target.value)}
              required
            />
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <select
              className={cx(styles, 'edit-input')}
              value={form.language_code}
              onChange={(e) => handleChange('language_code', e.target.value)}
              required
            >
              {VALID_LANGS.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <select
              className={cx(styles, 'edit-input')}
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              {WORD_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <input
              className={cx(styles, 'edit-input')}
              value={form.meaning}
              onChange={(e) => handleChange('meaning', e.target.value)}
              required
            />
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <input
              className={cx(styles, 'edit-input')}
              value={form.pronunciation}
              onChange={(e) => handleChange('pronunciation', e.target.value)}
            />
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <input
              className={cx(styles, 'edit-input')}
              value={form.synonyms}
              onChange={(e) => handleChange('synonyms', e.target.value)}
            />
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <input
              className={cx(styles, 'edit-input')}
              value={form.antonyms}
              onChange={(e) => handleChange('antonyms', e.target.value)}
            />
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <input
              className={cx(styles, 'edit-input')}
              value={form.example}
              onChange={(e) => handleChange('example', e.target.value)}
            />
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'table-cell-content')}>
            <input
              className={cx(styles, 'edit-input')}
              value={form.grammar}
              onChange={(e) => handleChange('grammar', e.target.value)}
            />
          </div>
        </td>
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'action-buttons')}>
            <button
              className={cx(styles, 'save-btn')}
              title="Valider"
              disabled={saving}
              onClick={save}
            >
              <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-check'}></i>
            </button>
            <button className={cx(styles, 'cancel-btn')} title="Annuler" onClick={() => setEditing(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{w.word}</div>
      </td>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{w.language_code}</div>
      </td>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{wordTypeLabel(w.type)}</div>
      </td>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{w.meaning}</div>
      </td>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{w.pronunciation}</div>
      </td>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{w.synonyms}</div>
      </td>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{w.antonyms}</div>
      </td>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{w.example && stripBoldMarkup(w.example)}</div>
      </td>
      <td className={cx(styles, 'table-cell')}>
        <div className={cx(styles, 'table-cell-content')}>{w.grammar}</div>
      </td>
      {!readOnly && (
        <td className={cx(styles, 'table-cell')}>
          <div className={cx(styles, 'action-buttons')}>
            <button className={cx(styles, 'edit-btn')} title="Modifier" onClick={startEditing}>
              <i className="fas fa-edit"></i>
            </button>
            <button className={cx(styles, 'delete-btn')} title="Supprimer" onClick={() => onDelete(w.detail_id)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
