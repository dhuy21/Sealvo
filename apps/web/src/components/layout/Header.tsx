'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/use-auth';

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: string;
  active: boolean;
}

export function Header({ signedInHint = false }: { signedInHint?: boolean }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, isAuthenticated, isReady } = useAuthStore();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 1024) setMobileOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  // Until refresh returns, trust the hint from the document so logout does not paint Dashboard then Home
  const signedIn = isReady ? isAuthenticated : signedInHint;

  const renderNavItem = (item: NavItem) => (
    <li key={item.id} className={`nav-item ${item.active ? 'active' : ''}`}>
      <Link href={item.href} className="nav-link" onClick={closeMobile}>
        <i className={item.icon} />
        <span>{item.label}</span>
      </Link>
    </li>
  );

  const navItems: NavItem[] = [
    {
      id: 'start',
      href: signedIn ? '/dashboard' : '/login',
      label: signedIn ? 'Dashboard' : 'Home',
      icon: 'fas fa-home',
      active: signedIn ? pathname === '/dashboard' : pathname === '/',
    },
    {
      id: 'feedback',
      href: '/feedback',
      label: 'Feedback',
      icon: 'fas fa-comments',
      active: pathname === '/feedback',
    },
    {
      id: 'packages',
      href: '/packages',
      label: 'My Packages',
      icon: 'fas fa-book',
      active: pathname === '/packages' || pathname.startsWith('/packages/'),
    },
  ];

  const aboutItem: NavItem = {
    id: 'about',
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
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="logo-img"
              />
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
                <button
                  className="logout-btn animated-logout-btn"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                >
                  <div className="sign">
                    <svg viewBox="0 0 512 512">
                      <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                    </svg>
                  </div>
                  <div className="text">Sign Out</div>
                </button>
              </div>
            ) : signedIn ? null : (
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
