import type { Word, UpdateWordPayload } from '@/hooks/use-words';
import { levelLabel, type Level } from '@sealvo/shared';
import { WordRow } from './WordRow';
import styles from '@/styles/vocabs.module.css';
import { cx } from '@/lib/css-module';

export function WordsLevelTable({
  level,
  words,
  isOwner,
  deleting,
  onSave,
  onDelete,
  savePending,
}: {
  level: Level;
  words: Word[];
  isOwner: boolean;
  deleting: boolean;
  onSave: (detailId: number, dto: UpdateWordPayload) => void;
  onDelete: (detailId: number) => void;
  savePending: boolean;
}) {
  return (
    <div
      className={cx(styles, 'level-container', deleting && 'level-deleting')}
      data-level={level}
    >
      <div className={cx(styles, 'level-header')}>
        <span>Niveau {levelLabel(level)}</span>
        <span className={cx(styles, 'level-badge')}>{words.length} mot(s)</span>
      </div>
      <table className={cx(styles, 'words-table')}>
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
            {isOwner && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {words.map((w) => (
            <WordRow
              key={w.detail_id}
              w={w}
              onSave={onSave}
              onDelete={onDelete}
              savePending={savePending}
              readOnly={!isOwner}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
