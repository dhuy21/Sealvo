'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboard, useUpdateProfile } from '@/hooks/use-dashboard';
import { getApiErrorMessage } from '@/lib/api-error';
import toast from 'react-hot-toast';
import { AvatarModal } from '@/components/dashboard/AvatarModal';
import { EditableField } from '@/components/dashboard/EditableField';
import { TypingText } from '@/components/dashboard/TypingText';
import { PackagesToReview } from '@/components/dashboard/PackagesToReview';
import { StreakSection } from '@/components/dashboard/StreakSection';
import { StarSVG } from '@/components/dashboard/StarSVG';
import { SparkleBtn } from '@/components/dashboard/SparkleBtn';

/* ─── Mouse Tracker ─── */
function useMouseTracker() {
  useEffect(() => {
    const tracker = document.createElement('div');
    tracker.className = 'mouse-tracker';
    document.body.appendChild(tracker);

    let timer: ReturnType<typeof setTimeout>;

    const onMove = (e: MouseEvent) => {
      tracker.style.opacity = '1';
      tracker.style.left = `${e.clientX}px`;
      tracker.style.top = `${e.clientY}px`;
      clearTimeout(timer);
      timer = setTimeout(() => {
        tracker.style.opacity = '0';
      }, 1000);
    };

    const onLeave = () => {
      tracker.style.opacity = '0';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      clearTimeout(timer);
      tracker.remove();
    };
  }, []);
}

/* ─── Wave Click Effect ─── */
function useWaveEffect() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const wave = document.createElement('div');
      wave.className = 'wave-effect';
      wave.style.left = `${e.clientX}px`;
      wave.style.top = `${e.clientY}px`;
      document.body.appendChild(wave);
      setTimeout(() => wave.remove(), 1000);

      const target = e.target as HTMLElement;
      const btn = target.closest('button, .dashboard-btn') as HTMLElement | null;
      if (btn) {
        btn.classList.add('pulse-animation');
        setTimeout(() => btn.classList.remove('pulse-animation'), 300);
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

/* ─── 3D Tilt Cards ─── */
function useCardTilt(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const cards = document.querySelectorAll<HTMLElement>('.action-card');

    const handlers = new Map<HTMLElement, { move: (e: MouseEvent) => void; leave: () => void }>();

    cards.forEach((card) => {
      const move = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const mx = e.clientX - cx;
        const my = e.clientY - cy;
        const max = 8;
        const ry = (max * mx) / (rect.width / 2);
        const rx = (-max * my) / (rect.height / 2);
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      };
      const leave = () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        setTimeout(() => {
          card.style.transform = '';
        }, 300);
      };
      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      handlers.set(card, { move, leave });
    });

    return () => {
      handlers.forEach(({ move, leave }, card) => {
        card.removeEventListener('mousemove', move);
        card.removeEventListener('mouseleave', leave);
      });
    };
  }, [ready]);
}

/* ═══════════════════════════ */
/* MAIN DASHBOARD PAGE        */
/* ═══════════════════════════ */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { data, isLoading, error } = useDashboard();
  const updateProfile = useUpdateProfile();
  const router = useRouter();
  const [avatarOpen, setAvatarOpen] = useState(false);

  // Decorative effects
  useMouseTracker();
  useWaveEffect();
  useCardTilt(!!data);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const handleFieldSave = useCallback(
    (fieldName: string, newValue: string, currentPassword?: string) => {
      updateProfile.mutate(
        { [fieldName]: newValue, current_password: currentPassword },
        {
          onSuccess: ({ pendingEmail }) => {
            if (pendingEmail) {
              toast.success(
                `Un email de confirmation a été envoyé à ${pendingEmail}. Cliquez sur le lien qu'il contient pour valider votre nouvelle adresse.`,
                { duration: 8000 },
              );
              return;
            }
            toast.success('Informations modifiées avec succès');
            if (user) {
              setUser({ ...user, [fieldName]: newValue });
            }
          },
          onError: (err) => {
            toast.error(getApiErrorMessage(err, 'Erreur lors de la modification'));
          },
        },
      );
    },
    [updateProfile, user, setUser],
  );

  const handleAvatarSave = useCallback(
    (ava: number) => {
      updateProfile.mutate(
        { ava },
        {
          onSuccess: () => {
            toast.success('Avatar modifié avec succès');
            setAvatarOpen(false);
            if (user) {
              setUser({ ...user, ava });
            }
          },
          onError: (err) => {
            toast.error(getApiErrorMessage(err, "Erreur lors de la modification de l'avatar"));
          },
        },
      );
    },
    [updateProfile, user, setUser],
  );

  if (isLoading) {
    return (
      <div className="home-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="home-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Erreur lors du chargement du tableau de bord.</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Floating icons */}
      <i className="fas fa-language floating-icons float-icon-1"></i>
      <i className="fas fa-brain floating-icons float-icon-2"></i>
      <i className="fas fa-graduation-cap floating-icons float-icon-3"></i>

      {/* Header */}
      <div className="dashboard-header fade-in">
        <h1>Tableau de Bord</h1>
      </div>

      <div className="dashboard-container">
        {/* Welcome */}
        <div className="dashboard-welcome fade-in">
          <i
            className="fas fa-hand-sparkles"
            style={{ color: '#FFCC70', marginRight: '0.5rem' }}
          ></i>
          Bienvenue{' '}
          <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
            {user?.username}
          </span>
          ,{' '}
          <TypingText text="voici le résumé de votre progression en vocabulaire." />
        </div>

        {/* Sidebar — Stats */}
        <div className="sidebar">
          <div className="dashboard-card fade-in">
            <h2>
              <i
                className="fas fa-chart-pie"
                style={{ color: '#C850C0', marginRight: '0.5rem' }}
              ></i>
              Mes Statistiques
            </h2>
            <div className="stats">
              <div className="stat-item">
                <div className="stat-number">{data.totalWords}</div>
                <div className="stat-label">Mots Totaux</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{data.learnedWords}</div>
                <div className="stat-label">Mots Maîtrisés</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{data.islearningWords}</div>
                <div className="stat-label">En Apprentissage</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{data.newWords}</div>
                <div className="stat-label">Nouveaux Mots</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="user-dashboard">
          <div className="dashboard-card fade-in user-profile-card">
            <div className="user-profile-header">
              <div className="avatar-container-dashboard">
                <img
                  src={`/images/avatars/${user?.ava ?? 1}.png`}
                  alt={`${user?.username}'s avatar`}
                  className="user-avatar-dashboard"
                />
                <button
                  type="button"
                  className="edit-btn-avatar"
                  title="Modifier l'avatar"
                  onClick={() => setAvatarOpen(true)}
                >
                  <i className="fas fa-edit"></i>
                </button>
              </div>
            </div>
            <div className="user-info">
              <EditableField
                label="Nom d'utilisateur:"
                icon="fas fa-user-tag"
                iconColor="#2b44bf"
                value={user?.username ?? ''}
                fieldName="username"
                onSave={handleFieldSave}
              />
              <EditableField
                label="Email:"
                icon="fas fa-envelope"
                iconColor="#b720ad"
                value={user?.email ?? ''}
                fieldName="email"
                requirePassword
                onSave={handleFieldSave}
              />
              <div className="info-row">
                <div className="info-label">
                  <i
                    className="fas fa-calendar-alt"
                    style={{ color: '#0a8f62', width: 30, marginRight: 8 }}
                  ></i>
                  Membre depuis:
                </div>
                <div className="info-value">{formatDate(user?.created_at ?? null)}</div>
              </div>
              <div className="info-row">
                <div className="info-label">
                  <i
                    className="fas fa-clock"
                    style={{ color: '#ba7d13', width: 30, marginRight: 8 }}
                  ></i>
                  Dernière connexion:
                </div>
                <div className="info-value">{formatDate(user?.last_login ?? null)}</div>
              </div>
            </div>
            <div className="text-center" style={{ marginTop: '4rem' }}>
              <SparkleBtn onClick={() => router.push('/forgot-password')}>
                <i className="fas fa-key"></i> Changer le mot de passe
              </SparkleBtn>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Action Card — Mes Packages */}
          <div className="dashboard-actions">
            <div className="action-card fade-in" style={{ borderLeft: '4px solid #C850C0' }}>
              <div
                className="action-card-icon"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(200, 80, 192, 0.2), rgba(200, 80, 192, 0.1))',
                }}
              >
                <i className="fas fa-plus-circle"></i>
              </div>
              <div className="action-card-content">
                <h3>
                  <i className="fas fa-magic" style={{ marginRight: '0.5rem' }}></i>Mes Packages
                </h3>
                <p>
                  <i
                    className="fas fa-feather-alt"
                    style={{ color: '#C850C0', marginRight: '0.25rem' }}
                  ></i>
                  Créez vos propres packages de mots.
                </p>
                <Link href="/packages" className="dashboard-btn dashboard-btn-primary sparkle-btn">
                  <i className="fas fa-bookmark"></i> Mes Packages
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className={`star-${n}`}>
                      <StarSVG />
                    </div>
                  ))}
                </Link>
              </div>
            </div>
          </div>

          {/* Streak */}
          <StreakSection streak={data.streak} />

          {/* Packages to Review */}
          <div className="tasks-activity fade-in">
            <div className="tasks-header">
              <h5>🔖 Packages à Réviser</h5>
              <span className="tasks-count">{data.packagesToReview.length}</span>
            </div>
            <PackagesToReview packages={data.packagesToReview} />
          </div>
        </div>

        {/* Footer */}
        <div className="dashboard-footer fade-in">
          <Link href="/" className="dashboard-btn dashboard-btn-primary sparkle-btn">
            <i className="fas fa-home"></i> Retour à l&apos;accueil
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className={`star-${n}`}>
                <StarSVG />
              </div>
            ))}
          </Link>
          <span style={{ display: 'inline-block', margin: '0 10px', color: 'var(--text-secondary)' }}>
            <i className="fas fa-heart" style={{ color: '#EF4444' }}></i>
          </span>
          <Link href="/feedback" className="dashboard-btn dashboard-btn-primary sparkle-btn">
            <i className="fas fa-comment-dots"></i> Feedback
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className={`star-${n}`}>
                <StarSVG />
              </div>
            ))}
          </Link>
        </div>
      </div>

      {/* Avatar Modal */}
      <AvatarModal
        open={avatarOpen}
        currentAva={user?.ava ?? 1}
        onClose={() => setAvatarOpen(false)}
        onSave={handleAvatarSave}
        saving={updateProfile.isPending}
      />
    </div>
  );
}
