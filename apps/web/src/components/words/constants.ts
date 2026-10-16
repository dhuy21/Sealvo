export const WORD_TYPES = [
  { value: 'noun', label: 'Nom' },
  { value: 'verb', label: 'Verbe' },
  { value: 'adjective', label: 'Adjectif' },
  { value: 'adverb', label: 'Adverbe' },
  { value: 'ph_v', label: 'Ph.V' },
  { value: 'idiom', label: 'Idiom' },
  { value: 'collocation', label: 'Colloc' },
];

export function wordTypeLabel(type: string): string {
  return WORD_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Display-only: examples store the target word as `**word**`. */
export function stripBoldMarkup(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}
