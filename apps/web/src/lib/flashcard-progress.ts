/** Same key as the learn session store. Hooks cannot import that component. */
export const flashcardProgressKey = (packageId: number) => `flashcards_progress_${packageId}`;

/** A shared word row is cloned under a new id. The saved session must follow that id. */
export function replaceFlashcardDetailId(packageId: number, fromId: number, toId: number): void {
  const key = flashcardProgressKey(packageId);
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return;
    const data = JSON.parse(saved) as { words?: number[] };
    if (!Array.isArray(data.words) || !data.words.includes(fromId)) return;
    data.words = data.words.map((id) => (id === fromId ? toId : id));
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Save progress error:', e);
  }
}
