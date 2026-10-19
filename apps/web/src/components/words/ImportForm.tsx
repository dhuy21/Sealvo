'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { IMPORT_MAX_FILE_BYTES } from '@sealvo/shared';
import { useImportFile } from '@/hooks/use-import';
import { getApiErrorMessage } from '@/lib/api-error';
import { notifyLongError } from '@/lib/notify';
import { SealAnimation } from '@/components/SealAnimation';
import { ImportFormatInfo } from './ImportFormatInfo';
import { settleWordsResponse } from './settle-words-response';
import styles from '@/styles/add-word.module.css';
import { cx } from '@/lib/css-module';

const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const IMPORT_ERROR = 'Une erreur est survenue. Veuillez réessayer plus tard.';

export function ImportForm({ packageId }: { packageId: number }) {
  const importFile = useImportFile(packageId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetFile = () => {
    if (inputRef.current) inputRef.current.value = '';
    setFileName(null);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      return;
    }
    if (file.size > IMPORT_MAX_FILE_BYTES) {
      toast.error('Le fichier est trop volumineux (max 5MB)');
      resetFile();
      return;
    }
    if (!EXCEL_MIME_TYPES.includes(file.type)) {
      toast.error('Format de fichier non supporté. Utilisez Excel');
      resetFile();
      return;
    }
    setFileName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error('Veuillez sélectionner un fichier à importer');
      return;
    }

    setBusy(true);
    try {
      const result = await importFile.mutateAsync(file);
      const done = await settleWordsResponse(result, {
        success: 'Import terminé avec succès',
        error: IMPORT_ERROR,
      });
      if (done) resetFile();
    } catch (err) {
      notifyLongError(getApiErrorMessage(err, IMPORT_ERROR));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles, 'import-section')}>
      <form className={cx(styles, 'import-form')} onSubmit={handleSubmit}>
        <div className={cx(styles, 'file-upload-container')}>
          <input
            ref={inputRef}
            type="file"
            id="vocab-file"
            name="file"
            accept=".xlsx,.xls"
            className={cx(styles, 'file-input')}
            onChange={handleSelect}
          />
          <label htmlFor="vocab-file" className={cx(styles, 'file-label')}>
            {busy ? (
              <SealAnimation size={120} />
            ) : (
              <>
                <span className={cx(styles, 'file-icon')}>📄</span>
                <span className={cx(styles, 'file-text')}>Choisir un fichier</span>
              </>
            )}
          </label>
          <span
            key={fileName ?? ''}
            className={cx(styles, 'selected-file-name', fileName && 'has-file')}
          >
            {fileName ?? 'Aucun fichier sélectionné'}
          </span>
        </div>
        <button
          type="submit"
          className={cx(styles, 'btn', 'btn-primary', 'import-btn')}
          disabled={busy}
          style={{ cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          {busy ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Importation en cours...
            </>
          ) : (
            <>
              <i className="fas fa-upload"></i> Importer du vocabulaire
            </>
          )}
        </button>
      </form>

      <ImportFormatInfo />
    </div>
  );
}
