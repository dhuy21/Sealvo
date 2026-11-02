'use client';

import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';

/** Search input and the animated "new package" folder button. */
export function PackagesToolbar({
  search,
  onSearchChange,
  onCreate,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className={cx(styles, 'search-container', 'fade-in')}>
      <div className={cx(styles, 'search-form')}>
        <div className={cx(styles, 'input-group')}>
          <input
            type="search"
            placeholder="Rechercher ..."
            className={cx(styles, 'search-input')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button type="button" className={cx(styles, 'search-btn')}>
            <i className="fas fa-search"></i>
          </button>
        </div>
      </div>
      <button className={cx(styles, 'continue-application')} onClick={onCreate}>
        <div>
          <div className={cx(styles, 'pencil')}></div>
          <div className={cx(styles, 'folder')}>
            <div className={cx(styles, 'top')}>
              <svg viewBox="0 0 24 27">
                <path d="M1,0 L23,0 C23.5522847,-1.01453063e-16 24,0.44771525 24,1 L24,8.17157288 C24,8.70200585 23.7892863,9.21071368 23.4142136,9.58578644 L20.5857864,12.4142136 C20.2107137,12.7892863 20,13.2979941 20,13.8284271 L20,26 C20,26.5522847 19.5522847,27 19,27 L1,27 C0.44771525,27 6.76353751e-17,26.5522847 0,26 L0,1 C-6.76353751e-17,0.44771525 0.44771525,1.01453063e-16 1,0 Z" />
              </svg>
            </div>
            <div className={cx(styles, 'paper')}></div>
          </div>
        </div>
        <span>
          <div className="fas fa-plus"></div>
        </span>
      </button>
    </div>
  );
}
