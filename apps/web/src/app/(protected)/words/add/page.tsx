'use client';

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePackage } from '@/hooks/use-packages';
import { getApiErrorMessage } from '@/lib/api-error';
import { ImportForm } from '@/components/words/ImportForm';
import { MultiWordForm } from '@/components/words/MultiWordForm';
import styles from '@/styles/add-word.module.css';
import { cx } from '@/lib/css-module';

function Notice({ children, backHref }: { children: ReactNode; backHref: string }) {
  return (
    <div className={cx(styles, 'add-word-container')} style={{ textAlign: 'center', padding: '4rem' }}>
      {children}
      <div className={cx(styles, 'form-actions')}>
        <Link href={backHref} className={cx(styles, 'btn', 'btn-tertiary')}>
          Retour
        </Link>
      </div>
    </div>
  );
}

function AddWordsContent() {
  const searchParams = useSearchParams();
  const packageId = Number(searchParams.get('package'));
  const pkgQuery = usePackage(packageId || null);
  const wordsHref = `/words?package=${packageId}`;

  if (!packageId) {
    return (
      <Notice backHref="/packages">
        <p>Aucun package sélectionné.</p>
      </Notice>
    );
  }

  if (pkgQuery.isLoading) {
    return (
      <div className={cx(styles, 'add-word-container')} style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (pkgQuery.isError || !pkgQuery.data) {
    return (
      <Notice backHref="/packages">
        <h3>Package inaccessible</h3>
        <p>
          {getApiErrorMessage(
            pkgQuery.error,
            "Ce package n'existe pas ou vous n'avez pas l'autorisation de le consulter.",
          )}
        </p>
      </Notice>
    );
  }

  if (!pkgQuery.data.isOwner) {
    return (
      <Notice backHref={wordsHref}>
        <p>
          <i className="fas fa-eye"></i> Lecture seule — package de{' '}
          <strong>{pkgQuery.data.username}</strong>
        </p>
      </Notice>
    );
  }

  return (
    <div className={cx(styles, 'add-word-container')}>
      <h1>Ajouter un nouveau mot</h1>
      <ImportForm packageId={packageId} />
      <div className={cx(styles, 'separator')}>
        <span>OU</span>
      </div>
      <MultiWordForm packageId={packageId} />
      <div className={cx(styles, 'form-actions')}>
        <Link href={wordsHref} className={cx(styles, 'btn', 'btn-tertiary')}>
          Annuler
        </Link>
      </div>
    </div>
  );
}

export default function AddWordsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
        </div>
      }
    >
      <AddWordsContent />
    </Suspense>
  );
}
