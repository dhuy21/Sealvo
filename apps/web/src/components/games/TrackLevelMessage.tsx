export type LevelStatus = 'completed' | 'failed' | '';

export function TrackLevelMessage({ message, status }: { message: string; status: LevelStatus }) {
  if (!message) return null;
  return <div className={`track-level-message ${status ? `level-${status}` : ''}`}>{message}</div>;
}
