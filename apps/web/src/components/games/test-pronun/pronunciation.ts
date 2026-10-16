import type { GameWord } from '@/hooks/use-games';
import api from '@/lib/api';

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return 1 - matrix[len1][len2] / Math.max(len1, len2);
}

function getPhoneticVariants(word: string): string[] {
  const variants = [word];
  const rules: [RegExp, string][] = [
    [/ph/g, 'f'],
    [/ck$/g, 'k'],
    [/ll/g, 'l'],
    [/ss/g, 's'],
    [/tt/g, 't'],
    [/c([aou])/g, 'k$1'],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(word)) {
      const variant = word.replace(pattern, replacement);
      if (variant !== word && !variants.includes(variant)) {
        variants.push(variant);
      }
    }
  }
  return variants;
}

export function calculatePronunciationAccuracy(spoken: string, target: string, confidence: number): number {
  const normalizedSpoken = spoken.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normalizedTarget = target.toLowerCase().replace(/[^\w\s]/g, '').trim();

  if (normalizedSpoken === normalizedTarget) {
    return Math.min(95 + confidence * 5, 100);
  }

  if (normalizedSpoken.includes(normalizedTarget) || normalizedTarget.includes(normalizedSpoken)) {
    return Math.round(Math.min(75 + confidence * 15, 85));
  }

  const similarity = calculateLevenshteinSimilarity(normalizedSpoken, normalizedTarget);

  if (similarity < 0.6) {
    return Math.max(10, Math.round(similarity * 30));
  }

  if (similarity >= 0.7) {
    const variants = getPhoneticVariants(normalizedTarget);
    for (const variant of variants) {
      if (normalizedSpoken === variant) {
        return Math.min(80 + confidence * 10, 90);
      }
    }
  }

  let baseAccuracy = similarity * 70;

  if (similarity >= 0.5 && normalizedSpoken.length > 2 && normalizedTarget.length > 2) {
    const startMatch = normalizedSpoken.substring(0, 2) === normalizedTarget.substring(0, 2);
    const endMatch = normalizedSpoken.slice(-2) === normalizedTarget.slice(-2);
    if (startMatch || endMatch) baseAccuracy += 5;
  }

  const lengthDifference = Math.abs(normalizedSpoken.length - normalizedTarget.length);
  const maxLength = Math.max(normalizedSpoken.length, normalizedTarget.length);
  if (1 - lengthDifference / maxLength < 0.7) baseAccuracy *= 0.7;

  let finalAccuracy = Math.min(baseAccuracy + confidence * 10, 75);

  if (normalizedSpoken.length > 0 && similarity >= 0.3) {
    finalAccuracy = Math.max(finalAccuracy, 15);
  } else {
    finalAccuracy = Math.max(finalAccuracy, 5);
  }

  return Math.round(finalAccuracy);
}

export async function playWordAudio(word: GameWord): Promise<void> {
  try {
    const response = await api.post('/tts/generate', {
      text: word.word,
      language: word.language_code || 'en-US',
    }, { responseType: 'blob' });

    const audioUrl = URL.createObjectURL(response.data);
    const audio = new Audio(audioUrl);
    audio.volume = 0.8;
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    audio.onerror = () => URL.revokeObjectURL(audioUrl);
    await audio.play();
  } catch (err) {
    console.error('TTS error:', err);
  }
}
