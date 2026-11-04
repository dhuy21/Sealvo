import type { CardProgress } from './deck';
import type { ReviewWord } from '@/hooks/use-words';
import { flashcardProgressKey } from '@/lib/flashcard-progress';

const storageKey = flashcardProgressKey;
const LEGACY_KEY = 'flashcards_progress';

interface SavedProgress {
  date: string;
  progress: CardProgress[];
  words: number[];
}

export function saveProgress(
  packageId: number,
  deck: ReviewWord[],
  progress: CardProgress[],
): void {
  try {
    const data: SavedProgress = {
      date: new Date().toISOString(),
      progress,
      words: deck.map((w) => w.detail_id),
    };
    localStorage.setItem(storageKey(packageId), JSON.stringify(data));
  } catch (e) {
    console.error('Save progress error:', e);
  }
}

/**
 * Restores the saved session when it was made on exactly the same set of words.
 * The deck is returned in the saved order so each progress entry stays on its card.
 */
function readSaved(key: string): SavedProgress | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  return JSON.parse(saved) as SavedProgress;
}

export function loadProgress(
  packageId: number,
  deck: ReviewWord[],
): { deck: ReviewWord[]; progress: CardProgress[] } | null {
  try {
    const own = readSaved(storageKey(packageId));
    const data = own ?? readSaved(LEGACY_KEY);
    if (!data) return null;
    const currentIds = deck.map((w) => w.detail_id);

    if (
      data.words.length === currentIds.length &&
      data.words.every((id) => currentIds.includes(id))
    ) {
      const byId = new Map(deck.map((w) => [w.detail_id, w]));
      const restored = {
        deck: data.words.map((id) => byId.get(id)!),
        progress: data.progress,
      };
      // The old key is one session. The first package it matches keeps it.
      if (!own) {
        saveProgress(packageId, restored.deck, restored.progress);
        try {
          localStorage.removeItem(LEGACY_KEY);
        } catch (e) {
          console.error('Load progress error:', e);
        }
      }
      return restored;
    }
  } catch (e) {
    console.error('Load progress error:', e);
  }
  return null;
}
