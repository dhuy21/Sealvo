import type { CardProgress } from './deck';
import type { ReviewWord } from '@/hooks/use-words';

const STORAGE_KEY = 'flashcards_progress';

interface SavedProgress {
  date: string;
  progress: CardProgress[];
  words: number[];
}

export function saveProgress(deck: ReviewWord[], progress: CardProgress[]): void {
  try {
    const data: SavedProgress = {
      date: new Date().toISOString(),
      progress,
      words: deck.map((w) => w.detail_id),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Save progress error:', e);
  }
}

/**
 * Restores the saved session when it was made on exactly the same set of words.
 * The deck is returned in the saved order so each progress entry stays on its card.
 */
export function loadProgress(
  deck: ReviewWord[],
): { deck: ReviewWord[]; progress: CardProgress[] } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved) as SavedProgress;
    const currentIds = deck.map((w) => w.detail_id);

    if (
      data.words.length === currentIds.length &&
      data.words.every((id) => currentIds.includes(id))
    ) {
      const byId = new Map(deck.map((w) => [w.detail_id, w]));
      return { deck: data.words.map((id) => byId.get(id)!), progress: data.progress };
    }
  } catch (e) {
    console.error('Load progress error:', e);
  }
  return null;
}
