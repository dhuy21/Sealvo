import styles from '@/styles/auth.module.css';
import { SectionHeading } from './SectionHeading';
import { WordCard } from './WordCard';

const FEATURED_WORDS = [
  {
    word: 'Ephemeral',
    pronunciation: '/ɪˈfɛm(ə)rəl/',
    definition: 'Lasting for a very short time',
    example: '"The ephemeral nature of fashion trends"',
  },
  {
    word: 'Serendipity',
    pronunciation: '/ˌsɛr(ə)nˈdɪpɪti/',
    definition: 'Finding something good without looking for it',
    example: '"The discovery was a perfect example of serendipity"',
  },
  {
    word: 'Eloquent',
    pronunciation: '/ˈɛləkwənt/',
    definition: 'Fluent or persuasive in speaking or writing',
    example: '"She gave an eloquent speech about education"',
  },
];

export function ShowcaseSection() {
  return (
    <section className={styles['showcase-section']}>
      <SectionHeading title="Featured Words" />

      <div className={styles['word-showcase']} style={{ perspective: '1000px' }}>
        {FEATURED_WORDS.map((word) => (
          <WordCard key={word.word} {...word} />
        ))}
      </div>
    </section>
  );
}
