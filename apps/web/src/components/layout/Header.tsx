'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, isAuthenticated, isReady } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 1024) setMobileOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    // Full reload instead of logout() + router.push: clearing the store while a protected page
    // is mounted makes AuthGuard redirect to /login?redirect=… before the push lands.
    // The reload also drops all in-memory auth and query state.
    window.location.assign('/');
  };

  const closeMobile = () => setMobileOpen(false);

  const renderNavItem = (item: NavItem) => (
    <li key={item.href} className={`nav-item ${item.active ? 'active' : ''}`}>
      <Link href={item.href} className="nav-link" onClick={closeMobile}>
        <i className={item.icon} />
        <span>{item.label}</span>
      </Link>
    </li>
  );

  const navItems: NavItem[] = [
    {
      href: isAuthenticated ? '/dashboard' : '/login',
      label: 'Home',
      icon: 'fas fa-home',
      active: pathname === '/dashboard' || pathname === '/',
    },
    {
      href: '/feedback',
      label: 'Feedback',
      icon: 'fas fa-comments',
      active: pathname === '/feedback',
    },
  ];

  const aboutItem: NavItem = {
    href: '/about',
    label: 'About',
    icon: 'fas fa-user',
    active: pathname === '/about',
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="brand-container">
          <Link href="/" className="brand-link" onClick={closeMobile}>
            <div className="logo-wrapper">
              <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="logo-img" />
              <div className="logo-glow" />
            </div>
            <h1 className="brand-text">SEALVO</h1>
          </Link>
        </div>

        <button
          className={`menu-toggle ${mobileOpen ? 'active' : ''}`}
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`nav-container ${mobileOpen ? 'active' : ''}`}>
          <nav className="main-nav">
            <ul className="nav-list">
              {navItems.map(renderNavItem)}

              <li
                ref={dropdownRef}
                className={`nav-item dropdown ${dropdownOpen ? 'open' : ''}`}
              >
                <button
                  className="nav-link dropdown-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen((v) => !v);
                  }}
                >
                  <i className="fas fa-th-large" />
                  <span>Services</span>
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <Link
                      href="/packages"
                      className="dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        closeMobile();
                      }}
                    >
                      <i className="fas fa-book" /> My Packages
                    </Link>
                  </li>
                </ul>
              </li>

              {renderNavItem(aboutItem)}
            </ul>
          </nav>

          <div className="user-controls">
            {/* Both icons are rendered: dark-mode.css shows the one matching the <html> class */}
            <button
              className="dark-mode-toggle"
              aria-label="Toggle dark mode"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <i className="fas fa-moon" />
              <i className="fas fa-sun" />
            </button>

            {isReady && isAuthenticated && user ? (
              <div className="user-profile">
                <div className="user-avatar">
                  {user.ava ? (
                    <Image
                      src={`/images/avatars/${user.ava}.png`}
                      alt={`${user.username}'s avatar`}
                      width={32}
                      height={32}
                    />
                  ) : (
                    <span>{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <button className="logout-btn animated-logout-btn" onClick={handleLogout}>
                  <div className="sign">
                    <svg viewBox="0 0 512 512">
                      <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                    </svg>
                  </div>
                  <div className="text">Sign Out</div>
                </button>
              </div>
            ) : isReady ? (
              <Link href="/login" className="login-btn" onClick={closeMobile}>
                <i className="fas fa-sign-in-alt" />
                <span>Sign In</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu-overlay" onClick={closeMobile} aria-hidden="true" />
      )}
    </header>
  );
}
