'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { isRecommendedBrowser } from './browser-check';
import { useDialog } from '@/hooks/use-dialog';
import { useIsClient } from '@/hooks/use-is-client';
import { useTimeouts } from '@/hooks/use-timeouts';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

const EXIT_ANIMATION_MS = 300;
const COPIED_FEEDBACK_MS = 2000;

/** Port of the old checkBrowser(): shown on each visit from a browser other than Chrome, Edge or Safari. */
export function BrowserWarningModal() {
  const isClient = useIsClient();
  const later = useTimeouts();
  const [state, setState] = useState<'open' | 'closing' | 'closed'>('open');
  const [copied, setCopied] = useState(false);

  const visible = isClient && state !== 'closed' && !isRecommendedBrowser(navigator.userAgent);

  function close() {
    setState('closing');
    later(() => setState('closed'), EXIT_ANIMATION_MS);
  }

  const dialogRef = useDialog<HTMLDivElement>(visible, close);

  if (!visible) return null;

  const siteUrl = window.location.origin;

  function copyUrl() {
    void navigator.clipboard.writeText(siteUrl).then(() => {
      setCopied(true);
      later(() => setCopied(false), COPIED_FEEDBACK_MS);
    });
  }

  function openInEdge() {
    const link = document.createElement('a');
    link.href = `microsoft-edge:${siteUrl}`;
    link.click();
  }

  return createPortal(
    <div
      ref={dialogRef}
      className={cx(styles, 'browser-modal', state === 'closing' && 'modal-exit')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="browser-modal-title"
      tabIndex={-1}
    >
      <div className={cx(styles, 'browser-content')}>
        <div className={cx(styles, 'modal-header')}>
          <div className={cx(styles, 'warning-icon')}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h2 id="browser-modal-title">Oops ! Navigateur non optimal</h2>
          <p className={cx(styles, 'subtitle')}>Passons à quelque chose de mieux ✨</p>
        </div>

        <div className={cx(styles, 'modal-body')}>
          <div className={cx(styles, 'recommended-browsers')}>
            <div className={cx(styles, 'browser-option', 'chrome')}>
              <div className={cx(styles, 'browser-icon')}>
                <i className="fab fa-chrome"></i>
              </div>
              <span>Chrome</span>
            </div>
            <div className={cx(styles, 'browser-option', 'edge')}>
              <div className={cx(styles, 'browser-icon')}>
                <i className="fab fa-edge"></i>
              </div>
              <span>Edge</span>
            </div>
            <div className={cx(styles, 'browser-option', 'safari')}>
              <div className={cx(styles, 'browser-icon')}>
                <i className="fab fa-safari"></i>
              </div>
              <span>Safari</span>
            </div>
          </div>

          <div className={cx(styles, 'site-info')}>
            <div className={cx(styles, 'site-badge')}>
              <i className="fas fa-globe"></i>
              <span className={cx(styles, 'site-badge-host')}>{window.location.hostname}</span>
              <button
                className={cx(styles, 'copy-btn')}
                title="Copier l'URL"
                style={copied ? { background: '#10b981' } : undefined}
                onClick={copyUrl}
              >
                <i className={copied ? 'fas fa-check' : 'fas fa-copy'}></i>
              </button>
            </div>
          </div>
        </div>

        <div className={cx(styles, 'modal-actions')}>
          <button className={cx(styles, 'change-browser-btn', 'primary-btn')} onClick={openInEdge}>
            <i className="fas fa-external-link-alt"></i>
            <span>Ouvrir dans Edge</span>
            <div className={cx(styles, 'btn-glow')}></div>
          </button>
          <button
            className={cx(styles, 'continue-anyway-btn', 'secondary-btn')}
            onClick={close}
            autoFocus
          >
            <i className="fas fa-play"></i>
            Continuer quand même
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
