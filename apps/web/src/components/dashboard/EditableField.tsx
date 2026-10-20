'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export function EditableField({
  label,
  icon,
  iconColor,
  value,
  fieldName,
  requirePassword = false,
  onSave,
}: {
  label: string;
  icon: string;
  iconColor: string;
  value: string;
  fieldName: 'username' | 'email';
  requirePassword?: boolean;
  onSave: (fieldName: string, newValue: string, currentPassword?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== value) {
      if (requirePassword && !password) {
        passwordRef.current?.focus();
        return;
      }
      onSave(fieldName, trimmed, requirePassword ? password : undefined);
    }
    setPassword('');
    setEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
    setPassword('');
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className={cx(styles, 'info-row', `row-${fieldName === 'username' ? 'name' : 'email'}`)}>
      <div className={cx(styles, 'info-label')}>
        <i className={icon} style={{ color: iconColor, width: 30, marginRight: 8 }}></i>
        {label}
      </div>
      <div className={cx(styles, 'info-value')}>
        {editing ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <input
                ref={inputRef}
                type="text"
                className={cx(styles, 'edit-input')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {requirePassword && (
                <input
                  ref={passwordRef}
                  type="password"
                  className={cx(styles, 'edit-input')}
                  placeholder="Mot de passe actuel"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              )}
            </div>
            <button className={cx(styles, 'save-btn')} title="Valider" onClick={handleSave}>
              <i className="fas fa-check"></i>
            </button>
            <button className={cx(styles, 'cancel-btn')} title="Annuler" onClick={handleCancel}>
              <i className="fas fa-times"></i>
            </button>
          </>
        ) : (
          <>
            <div className={`${fieldName}-display`}>{value}</div>
            <button
              className={cx(styles, 'edit-btn')}
              title="Modifier"
              onClick={() => {
                setInputValue(value);
                setEditing(true);
              }}
            >
              <i className="fas fa-edit"></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
