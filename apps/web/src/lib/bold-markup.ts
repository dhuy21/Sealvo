/** Examples store the target word as `**word**`; group 1 is the word. */
export const BOLD_MARKUP = /\*\*([^*]+)\*\*/g;

export function stripBoldMarkup(text: string): string {
  return text.replace(BOLD_MARKUP, '$1');
}
