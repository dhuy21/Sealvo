'use client';

import { useEffect, useRef, useState } from 'react';

export function EditableField({
  label,
  icon,
  iconColor,
  value,
  fieldName,
  onSave,
}: {
  label: string;
  icon: string;
  iconColor: string;
  value: string;
  fieldName: 'username' | 'email';
  onSave: (fieldName: string, newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(fieldName, trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className={`info-row row-${fieldName === 'username' ? 'name' : 'email'}`}>
      <div className="info-label">
        <i className={icon} style={{ color: iconColor, width: 30, marginRight: 8 }}></i>
        {label}
      </div>
      <div className="info-value">
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              className="edit-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="save-btn" title="Valider" onClick={handleSave}>
              <i className="fas fa-check"></i>
            </button>
            <button className="cancel-btn" title="Annuler" onClick={handleCancel}>
              <i className="fas fa-times"></i>
            </button>
          </>
        ) : (
          <>
            <div className={`${fieldName}-display`}>{value}</div>
            <button className="edit-btn" title="Modifier" onClick={() => setEditing(true)}>
              <i className="fas fa-edit"></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
