import {
  LEVELS,
  WORD_TYPES,
  levelLabel,
  type LanguageCode,
  type Level,
  type WordType,
} from '@sealvo/shared';

/** `label`: table and inline edit. `formLabel`: add-word form (old addWord.hbs). */
const WORD_TYPE_LABELS: Record<WordType, { label: string; formLabel: string }> = {
  noun: { label: 'Nom', formLabel: 'Nom' },
  verb: { label: 'Verbe', formLabel: 'Verbe' },
  adjective: { label: 'Adjectif', formLabel: 'Adjectif' },
  adverb: { label: 'Adverbe', formLabel: 'Adverbe' },
  ph_v: { label: 'Ph.V', formLabel: 'Phrasal Verb' },
  idiom: { label: 'Idiom', formLabel: 'Idiom' },
  collocation: { label: 'Colloc', formLabel: 'Collocation' },
};

export const WORD_TYPE_OPTIONS = WORD_TYPES.map((value) => ({ value, ...WORD_TYPE_LABELS[value] }));

export function wordTypeLabel(type: string): string {
  return WORD_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
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

const LEVEL_NAMES: Record<Level, string> = {
  x: 'À réviser',
  level_0: 'Débutant',
  level_1: 'Intermédiaire',
  level_2: 'Avancé',
  v: 'Maîtrisé',
};

export const LEVEL_OPTIONS = LEVELS.map((value) => ({
  value,
  label: `${levelLabel(value)} - ${LEVEL_NAMES[value]}`,
}));

/** Display-only: examples store the target word as `**word**`. */
export function stripBoldMarkup(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}
