import type { LanguageCode } from '@sealvo/shared';

/** `label`: table and inline edit. `formLabel`: add-word form (old addWord.hbs). */
export const WORD_TYPES = [
  { value: 'noun', label: 'Nom', formLabel: 'Nom' },
  { value: 'verb', label: 'Verbe', formLabel: 'Verbe' },
  { value: 'adjective', label: 'Adjectif', formLabel: 'Adjectif' },
  { value: 'adverb', label: 'Adverbe', formLabel: 'Adverbe' },
  { value: 'ph_v', label: 'Ph.V', formLabel: 'Phrasal Verb' },
  { value: 'idiom', label: 'Idiom', formLabel: 'Idiom' },
  { value: 'collocation', label: 'Colloc', formLabel: 'Collocation' },
];

export function wordTypeLabel(type: string): string {
  return WORD_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Shown next to each code in the add-word language select. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  'en-US': 'English United States',
  'en-GB': 'English United Kingdom',
  'fr-FR': 'French',
  'es-ES': 'Spanish Spain',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'ja-JP': 'Japanese',
  'zh-CN': 'Chinese Simplified',
  'zh-HK': 'Chinese Hong Kong',
  'zh-TW': 'Chinese Traditional',
  'pt-PT': 'Portuguese',
  'ru-RU': 'Russian',
  'vi-VN': 'Vietnamese',
  'ko-KR': 'Korean',
  'id-ID': 'Indonesian',
  'hi-IN': 'Hindi',
  'pl-PL': 'Polish',
  'nl-NL': 'Dutch',
};

export const LEVEL_OPTIONS = [
  { value: 'x', label: 'x - À réviser' },
  { value: 'level_0', label: '0 - Débutant' },
  { value: 'level_1', label: '1 - Intermédiaire' },
  { value: 'level_2', label: '2 - Avancé' },
  { value: 'v', label: 'v - Maîtrisé' },
];

/** Display-only: examples store the target word as `**word**`. */
export function stripBoldMarkup(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}
