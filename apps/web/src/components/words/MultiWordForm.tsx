'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import toast from 'react-hot-toast';
import { useAddWords } from '@/hooks/use-words';
import { getApiErrorMessage } from '@/lib/api-error';
import { notifyLongError } from '@/lib/notify';
import { clearFieldValidation, isFormField, validateField } from './field-validation';
import { settleWordsResponse } from './settle-words-response';
import { useUnsavedChangesWarning } from './use-unsaved-changes-warning';
import { useWordCards } from './use-word-cards';
import { isCardEdited } from './word-card';
import { WordCardForm } from './WordCardForm';
import styles from '@/styles/add-word.module.css';
import { cx } from '@/lib/css-module';

const SAVE_ERROR = "Erreur lors de l'enregistrement";
const REQUIRED_FIELDS = 'input[required], select[required], textarea[required]';

/** Several word cards sent in one request. */
export function MultiWordForm({ packageId }: { packageId: number }) {
  const { cards, patchCard, changeValue, addCard, duplicateCard, removeCard, clearValues } =
    useWordCards();
  const addWords = useAddWords(packageId);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Card to scroll to (and focus) once it is rendered.
  const revealRef = useRef<{ key: number; focus: boolean } | null>(null);

  useUnsavedChangesWarning(cards.some(isCardEdited));

  useEffect(() => {
    const target = revealRef.current;
    if (!target) return;
    revealRef.current = null;
    const index = cards.findIndex((c) => c.key === target.key);
    const card = containerRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!card) return;
    if (target.focus) card.querySelector<HTMLInputElement>('input[name="word"]')?.focus();
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [cards]);

  const handleAdd = () => {
    revealRef.current = { key: addCard(), focus: true };
  };

  const handleDuplicate = (index: number) => {
    revealRef.current = { key: duplicateCard(cards[index]), focus: false };
    toast.success('Carte dupliquée avec succès');
  };

  const handleRemove = (key: number) => {
    if (!removeCard(key)) toast.error('Vous devez avoir au moins une carte');
  };

  /** Old validateMultiWordForm: marks every required field, then reveals the first error. */
  const validateCards = (): boolean => {
    const fields = Array.from(containerRef.current?.querySelectorAll(REQUIRED_FIELDS) ?? []);
    const invalid = fields.filter((field) => isFormField(field) && !validateField(field));
    const firstError = invalid[0] as HTMLElement | undefined;
    if (!firstError) return true;

    toast.error(`Veuillez corriger les ${invalid.length} erreur(s) dans le formulaire`);
    const index = Number(
      firstError.closest<HTMLElement>(`.${styles['word-card-form']}`)?.dataset.index,
    );
    const card = cards[index];
    if (card?.collapsed) flushSync(() => patchCard(card.key, { collapsed: false }));
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstError.focus();
    return false;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateCards()) return;

    setSaving(true);
    try {
      const result = await addWords.mutateAsync(
        cards.filter((c) => !c.removing).map((c) => c.values),
      );
      const done = await settleWordsResponse(result, {
        success: 'Mots enregistrés avec succès !',
        error: SAVE_ERROR,
      });
      if (done) clearValues();
    } catch (err) {
      notifyLongError(getApiErrorMessage(err, SAVE_ERROR));
    } finally {
      setSaving(false);
    }
  };

  return (
    // noValidate: the browser would block the submit (silently for collapsed cards) before
    // validateCards can mark the fields and report the error count.
    <form
      className={cx(styles, 'word-form', 'multiple-words-form')}
      noValidate
      onSubmit={handleSubmit}
    >
      <div
        ref={containerRef}
        className={cx(styles, 'words-cards-container')}
        onBlur={(e) => {
          const t = e.target;
          if (
            isFormField(t) &&
            (t.required || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')
          ) {
            validateField(t);
          }
        }}
        onInput={(e) => {
          const t = e.target;
          if (isFormField(t) && t.required) clearFieldValidation(t);
        }}
      >
        {cards.map((card, index) => (
          <WordCardForm
            key={card.key}
            card={card}
            index={index}
            onChange={(field, value) => changeValue(card.key, field, value)}
            onDuplicate={() => handleDuplicate(index)}
            onToggleCollapse={() => patchCard(card.key, { collapsed: !card.collapsed })}
            onRemove={() => handleRemove(card.key)}
          />
        ))}
      </div>

      <div className={cx(styles, 'multiple-form-actions')}>
        <button type="button" className={cx(styles, 'btn', 'btn-secondary')} onClick={handleAdd}>
          <i className="fas fa-plus"></i>
          Ajouter un nouveau mot
        </button>
        <button
          type="submit"
          className={cx(styles, 'btn', 'btn-primary')}
          disabled={saving}
          style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Enregistrement...
            </>
          ) : (
            <>
              <i className="fas fa-save"></i>
              Enregistrer tous les mots
            </>
          )}
        </button>
      </div>
    </form>
  );
}
