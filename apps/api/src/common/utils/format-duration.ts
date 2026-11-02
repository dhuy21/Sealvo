const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const plural = (count: number, unit: string) => `${count} ${unit}${count > 1 ? 's' : ''}`;

/** French duration shown to users: whole hours as "1 heure" / "3 heures", otherwise minutes ("15 minutes"). */
export function formatDuration(ms: number): string {
  if (ms % HOUR_MS === 0) return plural(ms / HOUR_MS, 'heure');
  if (ms % MINUTE_MS === 0) return plural(ms / MINUTE_MS, 'minute');
  throw new Error(`formatDuration expects whole minutes, got ${ms} ms`);
}
