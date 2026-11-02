import styles from '@/styles/auth.module.css';

export function SectionHeading({ title }: { title: string }) {
  return (
    <div className={styles['section-heading']}>
      <h2>{title}</h2>
      <div className={styles['heading-underline']} />
    </div>
  );
}
