import type { QuizScreenFlags } from './use-quiz-effects';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/vocab-quiz.module.css';

export interface Question {
  word: string;
  options: string[];
  correctIndex: number[];
}

function optionClass(
  i: number,
  question: Question,
  selected: number[],
  lastSelected: number | null,
  answered: boolean,
) {
  const isCorrect = question.correctIndex.includes(i);
  let cls = 'option-btn';
  if (i === lastSelected) cls += ' selected';
  if (answered && isCorrect) cls += ' correct';
  else if (answered && selected.includes(i)) cls += ' incorrect';
  return cx(styles, ...cls.split(' '));
}

const withFlags = (base: string, flags: Record<string, boolean>) =>
  cx(
    styles,
    ...base.split(' '),
    ...Object.entries(flags)
      .filter(([, on]) => on)
      .map(([cls]) => cls),
  );

export function QuizQuestion({
  question: currentQ,
  questionNumber,
  totalQuestions,
  score,
  selected,
  lastSelected,
  answered,
  resultMsg,
  flags,
  onAnswer,
  onNext,
}: {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  score: number;
  selected: number[];
  lastSelected: number | null;
  answered: boolean;
  resultMsg: { text: string; correct: boolean } | null;
  flags: QuizScreenFlags;
  onAnswer: (optIdx: number) => void;
  onNext: () => void;
}) {
  return (
    <div
      className={withFlags('active-game-screen active', {
        'quiz-active': flags.quizActive,
        'question-loading': flags.questionLoading,
        'quiz-completion-glow': flags.completionGlow,
      })}
    >
      <div className={cx(styles, 'game-info')}>
        <div className={withFlags('score-display', { 'score-increase': flags.scoreIncrease })}>
          <span className={cx(styles, 'score-label')}>Score</span>
          <span className={cx(styles, 'score-value')}>{score}</span>
        </div>
        <div className={withFlags('progress-display', { updating: flags.progressUpdating })}>
          <span className={cx(styles, 'progress-label')}>Question</span>
          <span className={cx(styles, 'progress-value')}>
            {questionNumber}/{totalQuestions}
          </span>
        </div>
      </div>

      <div className={cx(styles, 'quiz-question-container')}>
        <div
          className={withFlags('quiz-word-container', { 'new-question': flags.questionLoading })}
        >
          <div className={withFlags('quiz-word', { revealing: flags.revealing })}>
            {currentQ.word}
          </div>
        </div>

        <div className={cx(styles, 'options-container')}>
          {currentQ.options.map((opt, i) => (
            <button
              key={i}
              className={optionClass(i, currentQ, selected, lastSelected, answered)}
              onClick={() => onAnswer(i)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {resultMsg && (
        <div className={cx(styles, 'result-message', resultMsg.correct ? 'correct' : 'incorrect')}>
          {resultMsg.text}
        </div>
      )}

      <div className={cx(styles, 'quiz-footer')}>
        <button className={cx(styles, 'next-btn')} disabled={!answered} onClick={onNext}>
          {answered && questionNumber === totalQuestions
            ? 'Voir les résultats'
            : 'Question suivante'}
        </button>
      </div>
    </div>
  );
}
