'use client';

import type { ActivityItem } from '@/hooks/use-activities';
import { useActivities } from '@/hooks/use-activities';
import { SealAnimation } from '@/components/SealAnimation';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

function RunningSeal() {
  return <SealAnimation size={28} />;
}

const TITLES: Record<ActivityItem['type'], string> = {
  login: 'Connexion',
  password_change: 'Mot de passe modifié',
  email_change: 'Adresse email modifiée',
  package_create: 'Package créé',
  package_delete: 'Package supprimé',
  import: 'Import',
  add_words: 'Mots ajoutés',
};

const PHASES: Record<NonNullable<ActivityItem['phase']>, string> = {
  parsing: 'Préparation',
  gemini: 'Analyse IA',
  saving: 'Enregistrement',
  done: 'Terminé',
};

function when(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const details = [
    item.fileName,
    item.packageName,
    item.wordCount !== null ? `${item.wordCount} mots` : null,
    item.errorCount ? `${item.errorCount} erreur(s)` : null,
    item.status === 'running' && item.phase ? PHASES[item.phase] : null,
    item.status === 'failed' ? (item.errorMessage ?? 'Échec') : null,
  ].filter(Boolean);

  return (
    <li
      className={cx(
        styles,
        'journal-row',
        item.status === 'running' && 'journal-running',
        item.status === 'failed' && 'journal-failed',
      )}
    >
      <div className={cx(styles, 'journal-main')}>
        <span className={cx(styles, 'journal-heading')}>
          {item.status === 'running' && <RunningSeal />}
          <span className={cx(styles, 'journal-title')}>{TITLES[item.type]}</span>
        </span>
        <time className={cx(styles, 'journal-time')} dateTime={item.occurredAt}>
          {when(item.occurredAt)}
        </time>
      </div>
      {details.length > 0 && <p className={cx(styles, 'journal-detail')}>{details.join(' · ')}</p>}
      {item.percent !== null && (
        <div
          className={cx(styles, 'journal-bar')}
          role="progressbar"
          aria-valuenow={item.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${item.percent}%` }} />
        </div>
      )}
    </li>
  );
}

export function ActivityJournal() {
  const query = useActivities();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className={cx(styles, 'tasks-activity', 'fade-in')}>
      <div className={cx(styles, 'tasks-header', 'journal-header')}>
        <h5>Journal</h5>
      </div>
      {query.isLoading ? (
        <p className={cx(styles, 'journal-empty')}>
          <i className="fas fa-spinner fa-spin"></i>
        </p>
      ) : query.isError ? (
        <p className={cx(styles, 'journal-empty')}>Le journal n&apos;a pas pu être chargé.</p>
      ) : items.length === 0 ? (
        <p className={cx(styles, 'journal-empty')}>Aucune activité pour le moment.</p>
      ) : (
        <ul className={cx(styles, 'journal-list')}>
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <button
          type="button"
          className={cx(styles, 'journal-more')}
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? 'Chargement...' : 'Voir plus'}
        </button>
      )}
    </section>
  );
}
