'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => setMounted(true), []);

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
    logout();
  };

  const closeMobile = () => setMobileOpen(false);

  const navItems = [
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
    {
      href: '/aboutme',
      label: 'About',
      icon: 'fas fa-user',
      active: pathname === '/aboutme',
    },
  ];

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
              {navItems.map((item) => (
                <li key={item.href} className={`nav-item ${item.active ? 'active' : ''}`}>
                  <Link href={item.href} className="nav-link" onClick={closeMobile}>
                    <i className={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}

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
                      href="/my-packages"
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
            </ul>
          </nav>

          <div className="user-controls">
            {mounted && (
              <button
                className="dark-mode-toggle"
                aria-label="Toggle dark mode"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} />
              </button>
            )}

            {isAuthenticated && user ? (
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
                <button className="logout-btn" onClick={handleLogout}>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="login-btn" onClick={closeMobile}>
                <i className="fas fa-sign-in-alt" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu-overlay" onClick={closeMobile} aria-hidden="true" />
      )}
    </header>
  );
}
