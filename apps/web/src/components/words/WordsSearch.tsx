'use client';

import styles from '@/styles/vocabs.module.css';
import { cx } from '@/lib/css-module';

/** Search input of the words page and, while searching, the result count. */
export function WordsSearch({
  search,
  onSearchChange,
  resultCount,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  resultCount: number;
}) {
  return (
    <>
      <div className={cx(styles, 'search-container')}>
        <div className={cx(styles, 'search-form')}>
          <div className={cx(styles, 'input-group')}>
            <input
              type="text"
              placeholder="Tapez pour rechercher un mot..."
              className={cx(styles, 'search-input')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button type="button" className={cx(styles, 'search-btn')}>
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>

      {search && (
        <div className={cx(styles, 'search-results-info')} style={{ display: 'block' }}>
          <p>
            <span>{resultCount}</span> résultat(s) pour <strong>{search}</strong>
          </p>
        </div>
      )}
    </>
  );
}
