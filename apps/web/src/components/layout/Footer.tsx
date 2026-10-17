'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getYear = () => new Date().getFullYear();
// Prerendering (cacheComponents) rejects `new Date()`: the year is filled in on the client
const getServerYear = () => null;

export function Footer() {
  const year = useSyncExternalStore(subscribe, getYear, getServerYear);

  return (
    <footer className="site-footer" id="site-footer">
      <div className="footer-container">
        <div className="footer-row">
          <div className="footer-col">
            <h3>SealVo</h3>
            <div className="social-links">
              <a href="#" aria-label="Facebook">
                <i className="fab fa-facebook-f" />
              </a>
              <a href="#" aria-label="Twitter">
                <i className="fab fa-twitter" />
              </a>
              <a href="#" aria-label="Instagram">
                <i className="fab fa-instagram" />
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h3>Liens</h3>
            <div className="footer-links">
              <Link href="/">Accueil</Link>
              <Link href="/about">À propos</Link>
              <Link href="/dashboard">Vocabulaire</Link>
            </div>
          </div>

          <div className="footer-col">
            <h3>Contact</h3>
            <p>
              <i className="fas fa-envelope" /> contact@sealvo.it.com
            </p>
          </div>
        </div>
        <div className="copyright">
          <p>&copy; {year} SealVo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
