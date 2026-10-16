'use client';

import { VALID_LANGS } from '@sealvo/shared';
import { LANGUAGE_NAMES, LEVEL_OPTIONS, WORD_TYPES } from './constants';
import type { WordCard, WordCardValues } from './word-card';
import styles from '@/styles/add-word.module.css';
import { cx } from '@/lib/css-module';

interface WordCardFormProps {
  card: WordCard;
  index: number;
  onChange: (field: keyof WordCardValues, value: string) => void;
  onDuplicate: () => void;
  onToggleCollapse: () => void;
  onRemove: () => void;
}

/** One word of the multi-word form (markup of the old addWord.hbs card template). */
export function WordCardForm({
  card,
  index,
  onChange,
  onDuplicate,
  onToggleCollapse,
  onRemove,
}: WordCardFormProps) {
  const field = (name: keyof WordCardValues) => ({
    id: `${name}-${index}`,
    name,
    value: card.values[name],
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => onChange(name, e.target.value),
    className: cx(styles, 'form-control'),
  });

  const classes = ['word-card-form'];
  if (card.collapsed) classes.push('collapsed');
  if (card.removing) classes.push('removing');
  if (card.shaking) classes.push('shaking');

  return (
    <div className={cx(styles, ...classes)} data-index={index}>
      <div className={cx(styles, 'card-header')}>
        <div className={cx(styles, 'card-title')}>
          <span className={cx(styles, 'card-number')}>{index + 1}</span>
          <h3>{card.values.word.trim() || 'Nouveau mot'}</h3>
        </div>
        <div className={cx(styles, 'card-actions')}>
          <button type="button" className={cx(styles, 'btn-icon', 'btn-duplicate')} title="Dupliquer" onClick={onDuplicate}>
            <i className="fas fa-copy"></i>
          </button>
          <button
            type="button"
            className={cx(styles, 'btn-icon', 'btn-collapse')}
            title="Réduire/Agrandir"
            onClick={onToggleCollapse}
          >
            <i className="fas fa-chevron-up"></i>
          </button>
          <button type="button" className={cx(styles, 'btn-icon', 'btn-remove')} title="Supprimer" onClick={onRemove}>
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <div className={cx(styles, 'card-body')}>
        <div className={cx(styles, 'form-section')}>
          <div className={cx(styles, 'section-title')}>
            <i className="fas fa-info-circle"></i>
            <span>Informations de base</span>
          </div>
          <div className={cx(styles, 'form-grid')}>
            <div className={cx(styles, 'form-group', 'full-width')}>
              <label htmlFor={`word-${index}`}>Mot *</label>
              <input type="text" required placeholder="Entrez le mot" {...field('word')} />
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`language_code-${index}`}>Langue *</label>
              <select required {...field('language_code')}>
                {VALID_LANGS.map((code) => (
                  <option key={code} value={code}>
                    {code} ({LANGUAGE_NAMES[code]})
                  </option>
                ))}
              </select>
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`subject-${index}`}>Sujet *</label>
              <input type="text" required placeholder="ex: Technology" {...field('subject')} />
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`type-${index}`}>Type *</label>
              <select required {...field('type')}>
                <option value="" disabled>
                  Choisir un type
                </option>
                {WORD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.formLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`pronunciation-${index}`}>Prononciation</label>
              <input type="text" placeholder="ex: /həˈloʊ/" {...field('pronunciation')} />
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`level-${index}`}>Niveau d&apos;apprentissage *</label>
              <select required {...field('level')}>
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={cx(styles, 'form-section')}>
          <div className={cx(styles, 'section-title')}>
            <i className="fas fa-book"></i>
            <span>Définition et exemples</span>
          </div>
          <div className={cx(styles, 'form-grid')}>
            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`meaning-${index}`}>Signification *</label>
              <textarea
                required
                placeholder="Entrez la signification du mot"
                rows={2}
                {...field('meaning')}
              ></textarea>
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`example-${index}`}>Exemple</label>
              <textarea
                placeholder="Entrez un exemple d'utilisation"
                rows={2}
                {...field('example')}
              ></textarea>
            </div>
          </div>
        </div>

        <details className={cx(styles, 'form-section')}>
          <summary className={cx(styles, 'section-title')}>
            <i className="fas fa-graduation-cap"></i>
            <span>Plus de détails supplémentaires</span>
          </summary>
          <div className={cx(styles, 'form-grid')}>
            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`synonyms-${index}`}>Synonymes</label>
              <input type="text" placeholder="ex: happy, joyful" {...field('synonyms')} />
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`antonyms-${index}`}>Antonymes</label>
              <input type="text" placeholder="ex: sad, unhappy" {...field('antonyms')} />
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor={`grammar-${index}`}>Grammaire</label>
              <input type="text" placeholder="ex: irregular verb" {...field('grammar')} />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
