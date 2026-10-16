export interface Question {
  word: string;
  options: string[];
  correctIndex: number[];
}

export function QuizQuestion({
  question: currentQ,
  questionNumber,
  totalQuestions,
  score,
  selectedOption,
  answered,
  resultMsg,
  onAnswer,
  onNext,
}: {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  score: number;
  selectedOption: number | null;
  answered: boolean;
  resultMsg: { text: string; correct: boolean } | null;
  onAnswer: (optIdx: number) => void;
  onNext: () => void;
}) {
  return (
    <div className="active-game-screen active">
      <div className="game-info">
        <div className="score-display">
          <span className="score-label">Score</span>
          <span className="score-value">{score}</span>
        </div>
        <div className="progress-display">
          <span className="progress-label">Question</span>
          <span className="progress-value">
            {questionNumber}/{totalQuestions}
          </span>
        </div>
      </div>

      <div className="quiz-question-container">
        <div className="quiz-word-container">
          <div className="quiz-word">{currentQ.word}</div>
        </div>

        <div className="options-container">
          {currentQ.options.map((opt, i) => (
            <button
              key={i}
              className={`option-btn${selectedOption === i ? (currentQ.correctIndex.includes(i) ? ' correct' : ' incorrect') : ''}${answered && currentQ.correctIndex.includes(i) ? ' correct' : ''}`}
              onClick={() => onAnswer(i)}
              disabled={answered}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {resultMsg && (
        <div className={`result-message ${resultMsg.correct ? 'correct' : 'incorrect'}`}>
          {resultMsg.text}
        </div>
      )}

      <div className="quiz-footer">
        <button className="next-btn" disabled={!answered} onClick={onNext}>
          {questionNumber === totalQuestions ? 'Voir les résultats' : 'Question suivante'}
        </button>
      </div>
    </div>
  );
}
