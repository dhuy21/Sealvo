'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboard } from '@/hooks/use-dashboard';
import { getApiErrorMessage } from '@/lib/api-error';
import { AvatarModal } from '@/components/dashboard/AvatarModal';
import { TypingText } from '@/components/dashboard/TypingText';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { PackagesToReview } from '@/components/dashboard/PackagesToReview';
import { ActivityJournal } from '@/components/dashboard/ActivityJournal';
import { SparkleLink } from '@/components/dashboard/SparkleLink';
import { StreakSection } from '@/components/dashboard/StreakSection';
import { useProfileActions } from '@/components/dashboard/use-profile-actions';
import {
  useCardTilt,
  useMouseTracker,
  useButtonPulse,
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
  useButtonPulse();
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

  // A failed background refetch keeps the data already shown
  if (!data) {
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
          Bienvenue <span style={{ fontWeight: 700 }}>{user?.username}</span>,{' '}
          <TypingText text="voici le résumé de votre progression en vocabulaire." />
        </div>

        <div className={cx(styles, 'sidebar')}>
          <StatsCard stats={data} />
        </div>

        <div className={cx(styles, 'user-dashboard')}>
          <ProfileCard
            user={user}
            onEditAvatar={() => setAvatarOpen(true)}
            onFieldSave={profile.saveField}
            onTestReminder={profile.sendTestReminder}
          />
        </div>

        <div className={cx(styles, 'main-content')}>
          <div className={cx(styles, 'main-scroll')}>
            <StreakSection streak={data.streak} />

            <div className={cx(styles, 'tasks-activity', 'fade-in')}>
              <div className={cx(styles, 'tasks-header')}>
                <div className={cx(styles, 'tasks-packages-link')}>
                  <SparkleLink href="/packages">
                    <i className="fas fa-bookmark"></i> Mes Packages
                  </SparkleLink>
                </div>
                <h5>🔖 Packages à Réviser</h5>
                <span className={cx(styles, 'tasks-count')}>{data.packagesToReview.length}</span>
              </div>
              <PackagesToReview packages={data.packagesToReview} />
            </div>

            <ActivityJournal />
          </div>
        </div>
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
