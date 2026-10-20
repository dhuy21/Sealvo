export type CssModule = Readonly<Record<string, string>>;

/** Maps class names through a CSS Module; names it doesn't define (global classes) are kept as-is. */
export function cx(styles: CssModule, ...names: (string | false | null | undefined)[]): string {
  return names
    .filter((name): name is string => Boolean(name))
    .map((name) => styles[name] ?? name)
    .join(' ');
}
