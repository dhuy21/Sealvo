/** The message of a caught value: libraries also throw strings and plain objects */
export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
