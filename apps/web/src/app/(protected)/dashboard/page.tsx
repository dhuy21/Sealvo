'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboard, useUpdateProfile } from '@/hooks/use-dashboard';
import toast from 'react-hot-toast';
import type { PackageToReview } from '@/hooks/use-dashboard';

/* ─── Avatar Modal ─── */
function AvatarModal({
  open,
  currentAva,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  currentAva: number;
  onClose: () => void;
  onSave: (ava: number) => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState(currentAva);

  useEffect(() => {
    if (open) setSelected(currentAva);
  }, [open, currentAva]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="avatar-modal"
      style={{ display: 'block', opacity: 1 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="avatar-modal-content">
        <div className="avatar-modal-header">
          <h3>
            <i className="fas fa-user-circle"></i> Choisir un nouvel avatar
          </h3>
          <span className="avatar-modal-close" onClick={onClose}>
            &times;
          </span>
        </div>
        <div className="avatar-modal-body">
          <div className="avatar-grid">
            {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={`avatar-option${selected === n ? ' selected' : ''}`}
                data-avatar={n}
                onClick={() => setSelected(n)}
              >
                <img
                  src={`/images/avatars/${n}.png`}
                  alt={`Avatar ${n}`}
                  className="avatar-selection"
                  loading="lazy"
                />
                {selected === n && (
                  <div className="avatar-selected">
                    <i className="fas fa-check"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="avatar-modal-footer">
          <button onClick={onClose}>Annuler</button>
          <button onClick={() => onSave(selected)} disabled={saving}>
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Inline Edit Field ─── */
function EditableField({
  label,
  icon,
  iconColor,
  value,
  fieldName,
  onSave,
}: {
  label: string;
  icon: string;
  iconColor: string;
  value: string;
  fieldName: 'username' | 'email';
  onSave: (fieldName: string, newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(fieldName, trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className={`info-row row-${fieldName === 'username' ? 'name' : 'email'}`}>
      <div className="info-label">
        <i className={icon} style={{ color: iconColor, width: 30, marginRight: 8 }}></i>
        {label}
      </div>
      <div className="info-value">
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              className="edit-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="save-btn" title="Valider" onClick={handleSave}>
              <i className="fas fa-check"></i>
            </button>
            <button className="cancel-btn" title="Annuler" onClick={handleCancel}>
              <i className="fas fa-times"></i>
            </button>
          </>
        ) : (
          <>
            <div className={`${fieldName}-display`}>{value}</div>
            <button className="edit-btn" title="Modifier" onClick={() => setEditing(true)}>
              <i className="fas fa-edit"></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Typing Text ─── */
function TypingText({ text, delay = 50 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, delay);
    return () => clearInterval(timer);
  }, [text, delay]);

  return <span className="typing-text">{displayed}</span>;
}

/* ─── Packages to Review ─── */
function PackagesToReview({ packages }: { packages: PackageToReview[] }) {
  const router = useRouter();

  if (packages.length === 0) {
    return (
      <div className="no-activity">
        <div className="no-activity-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <h4>Excellent travail !</h4>
        <p>Toutes vos tâches sont terminées. Vous êtes à jour dans vos révisions !</p>
      </div>
    );
  }

  return (
    <ul className="activity-list">
      {packages.map((pkg) => (
        <li
          key={pkg.package_id}
          className="activity-item task-card"
          onClick={() => router.push(`/words?package=${pkg.package_id}`)}
        >
          <div className="task-icon">📜</div>
          <div className="task-content">
            <div className="activity-title">{pkg.package_name}</div>
            <div className="activity-time">
              🧠
              <div className="word-count">{pkg.num_words}</div>
              <div className="word-label">mots à réviser</div>
            </div>
          </div>
          <div className="task-actions">
            <div className="task-priority">
              <div className="priority-dot"></div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─── Streak Section ─── */
function StreakSection({ streak }: { streak: number }) {
  const maxDays = 30;
  const fireStreak = Math.floor(streak / maxDays) * maxDays;
  const remainder = streak % maxDays;
  const percent = Math.min((remainder / maxDays) * 100, 100);

  return (
    <div className="dashboard-card fade-in">
      <div className="text-center">
        <div className="streak-display">
          <div className="progress-container fade-in">
            <h3>
              <i className="fas fa-fire" style={{ color: '#F59E0B', marginRight: '0.5rem' }}></i>
              Séries d&apos;Apprentissage
            </h3>
            <div className="fire-section">
              <div className="fire">
                <div className="fire-left">
                  <div className="main-fire"></div>
                  <div className="particle-fire"></div>
                </div>
                <div className="fire-center">
                  <div className="main-fire"></div>
                  <div className="particle-fire"></div>
                </div>
                <div className="fire-right">
                  <div className="main-fire"></div>
                  <div className="particle-fire"></div>
                </div>
                <div className="fire-bottom">
                  <div className="main-fire"></div>
                </div>
                <div className="fire-streak-text" id="fireStreakText">
                  {fireStreak}
                </div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
            </div>
            <div className="progress-bar-labels">
              <span>
                <i
                  className="fas fa-tachometer-alt"
                  style={{ color: '#4158D0', marginRight: '0.25rem' }}
                ></i>
                Progression
              </span>
              <span>
                <i
                  className="fas fa-trophy"
                  style={{ color: '#FFCC70', marginRight: '0.25rem' }}
                ></i>
                {remainder}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
function useCardTilt() {
  useEffect(() => {
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
  }, []);
}

/* ─── Sparkle Button SVG ─── */
const StarSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53">
    <path
      className="fil0"
      d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"
    />
  </svg>
);

function SparkleBtn({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button className="dashboard-btn dashboard-btn-primary sparkle-btn" {...props}>
      {children}
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className={`star-${n}`}>
          <StarSVG />
        </div>
      ))}
    </button>
  );
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
  useCardTilt();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const handleFieldSave = useCallback(
    (fieldName: string, newValue: string) => {
      updateProfile.mutate(
        { [fieldName]: newValue },
        {
          onSuccess: () => {
            toast.success('Informations modifiées avec succès');
            if (user) {
              setUser({ ...user, [fieldName]: newValue });
            }
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? 'Erreur lors de la modification');
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
          onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Erreur lors de la modification de l'avatar");
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
              <SparkleBtn onClick={() => router.push('/change-password')}>
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
                <a href="/packages" className="dashboard-btn dashboard-btn-primary sparkle-btn">
                  <i className="fas fa-bookmark"></i> Mes Packages
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className={`star-${n}`}>
                      <StarSVG />
                    </div>
                  ))}
                </a>
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
          <a href="/" className="dashboard-btn dashboard-btn-primary sparkle-btn">
            <i className="fas fa-home"></i> Retour à l&apos;accueil
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className={`star-${n}`}>
                <StarSVG />
              </div>
            ))}
          </a>
          <span style={{ display: 'inline-block', margin: '0 10px', color: 'var(--text-secondary)' }}>
            <i className="fas fa-heart" style={{ color: '#EF4444' }}></i>
          </span>
          <a href="/feedback" className="dashboard-btn dashboard-btn-primary sparkle-btn">
            <i className="fas fa-comment-dots"></i> Feedback
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className={`star-${n}`}>
                <StarSVG />
              </div>
            ))}
          </a>
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
