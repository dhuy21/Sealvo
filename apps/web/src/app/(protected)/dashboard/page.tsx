'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboard } from '@/hooks/use-dashboard';
import { getApiErrorMessage } from '@/lib/api-error';
import { AvatarModal } from '@/components/dashboard/AvatarModal';
import { TypingText } from '@/components/dashboard/TypingText';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { PackagesActionCard } from '@/components/dashboard/PackagesActionCard';
import { PackagesToReview } from '@/components/dashboard/PackagesToReview';
import { StreakSection } from '@/components/dashboard/StreakSection';
import { DashboardFooter } from '@/components/dashboard/DashboardFooter';
import { useProfileActions } from '@/components/dashboard/use-profile-actions';
import {
  useCardTilt,
  useMouseTracker,
  useWaveEffect,
} from '@/components/dashboard/use-dashboard-effects';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useDashboard();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const closeAvatar = useCallback(() => setAvatarOpen(false), []);
  const profile = useProfileActions({ onAvatarSaved: closeAvatar });

  // Decorative effects
  useMouseTracker();
  useWaveEffect();
  useCardTilt(!!data);

  if (isLoading) {
    return (
      <div
        className={cx(styles, 'home-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={cx(styles, 'home-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <p>{getApiErrorMessage(error, 'Erreur lors du chargement du tableau de bord.')}</p>
      </div>
    );
  }

  return (
    <div className={cx(styles, 'home-container')}>
      {/* Floating icons */}
      <i className={cx(styles, 'fas', 'fa-language', 'floating-icons', 'float-icon-1')}></i>
      <i className={cx(styles, 'fas', 'fa-brain', 'floating-icons', 'float-icon-2')}></i>
      <i className={cx(styles, 'fas', 'fa-graduation-cap', 'floating-icons', 'float-icon-3')}></i>

      {/* Header */}
      <div className={cx(styles, 'dashboard-header', 'fade-in')}>
        <h1>Tableau de Bord</h1>
      </div>

      <div className={cx(styles, 'dashboard-container')}>
        {/* Welcome */}
        <div className={cx(styles, 'dashboard-welcome', 'fade-in')}>
          <i
            className="fas fa-hand-sparkles"
            style={{ color: '#FFCC70', marginRight: '0.5rem' }}
          ></i>
          Bienvenue{' '}
          <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{user?.username}</span>,{' '}
          <TypingText text="voici le résumé de votre progression en vocabulaire." />
        </div>

        {/* Sidebar — Stats */}
        <div className={cx(styles, 'sidebar')}>
          <StatsCard stats={data} />
        </div>

        {/* User Profile */}
        <div className={cx(styles, 'user-dashboard')}>
          <ProfileCard
            user={user}
            onEditAvatar={() => setAvatarOpen(true)}
            onFieldSave={profile.saveField}
            onTestReminder={profile.sendTestReminder}
          />
        </div>

        {/* Main Content */}
        <div className={cx(styles, 'main-content')}>
          {/* Action Card — Mes Packages */}
          <div className={cx(styles, 'dashboard-actions')}>
            <PackagesActionCard />
          </div>

          {/* Streak */}
          <StreakSection streak={data.streak} />

          {/* Packages to Review */}
          <div className={cx(styles, 'tasks-activity', 'fade-in')}>
            <div className={cx(styles, 'tasks-header')}>
              <h5>🔖 Packages à Réviser</h5>
              <span className={cx(styles, 'tasks-count')}>{data.packagesToReview.length}</span>
            </div>
            <PackagesToReview packages={data.packagesToReview} />
          </div>
        </div>

        <DashboardFooter />
      </div>

      {/* Avatar Modal */}
      <AvatarModal
        open={avatarOpen}
        currentAva={user?.ava ?? 1}
        onClose={closeAvatar}
        onSave={profile.saveAvatar}
        saving={profile.saving}
      />
    </div>
  );
}
