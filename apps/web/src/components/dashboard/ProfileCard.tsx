'use client';

import { useRouter } from 'next/navigation';
import type { User } from '@/stores/auth.store';
import { EditableField } from './EditableField';
import { SparkleBtn } from './SparkleBtn';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function ProfileCard({
  user,
  onEditAvatar,
  onFieldSave,
  onTestReminder,
}: {
  user: User | null;
  onEditAvatar: () => void;
  onFieldSave: (fieldName: string, newValue: string, currentPassword?: string) => void;
  onTestReminder: () => void;
}) {
  const router = useRouter();

  return (
    <div className={cx(styles, 'dashboard-card', 'fade-in', 'user-profile-card')}>
      <div className={cx(styles, 'user-profile-header')}>
        <div className={cx(styles, 'avatar-container-dashboard')}>
          <img
            src={`/images/avatars/${user?.ava ?? 1}.png`}
            alt={`${user?.username}'s avatar`}
            className={cx(styles, 'user-avatar-dashboard')}
          />
          <button
            type="button"
            className={cx(styles, 'edit-btn-avatar')}
            title="Modifier l'avatar"
            onClick={onEditAvatar}
          >
            <i className="fas fa-edit"></i>
          </button>
        </div>
      </div>
      <div className={cx(styles, 'user-info')}>
        <EditableField
          label="Nom d'utilisateur:"
          icon="fas fa-user-tag"
          iconColor="#2b44bf"
          value={user?.username ?? ''}
          fieldName="username"
          onSave={onFieldSave}
        />
        <EditableField
          label="Email:"
          icon="fas fa-envelope"
          iconColor="#b720ad"
          value={user?.email ?? ''}
          fieldName="email"
          requirePassword
          onSave={onFieldSave}
        />
        <div className={cx(styles, 'info-row')}>
          <div className={cx(styles, 'info-label')}>
            <i
              className="fas fa-calendar-alt"
              style={{ color: '#0a8f62', width: 30, marginRight: 8 }}
            ></i>
            Membre depuis:
          </div>
          <div className={cx(styles, 'info-value')}>{formatDate(user?.created_at ?? null)}</div>
        </div>
        <div className={cx(styles, 'info-row')}>
          <div className={cx(styles, 'info-label')}>
            <i className="fas fa-bell" style={{ color: '#ee1616', width: 20, marginRight: 20 }}></i>
            <div className={cx(styles, 'info-value')}>
              <SparkleBtn id="reminderBtn" onClick={onTestReminder}>
                <i className="fas fa-mail-bulk"></i> Test Reminder
              </SparkleBtn>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center" style={{ marginTop: '4rem' }}>
        <SparkleBtn onClick={() => router.push('/forgot-password')}>
          <i className="fas fa-key"></i> Changer le mot de passe
        </SparkleBtn>
      </div>
    </div>
  );
}
