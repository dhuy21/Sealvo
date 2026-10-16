import { cx, type CssModule } from '@/lib/css-module';

export type LevelStatus = 'completed' | 'failed' | '';

export function TrackLevelMessage({
  message,
  status,
  styles,
}: {
  message: string;
  status: LevelStatus;
  styles: CssModule;
}) {
  if (!message) return null;
  return (
    <div className={cx(styles, 'track-level-message', status && `level-${status}`)}>{message}</div>
  );
}
