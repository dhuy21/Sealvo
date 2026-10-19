/** Bar under the job toast. `percent` is 0–100 for the whole import. */
export function JobProgressToast({ text, percent }: { text: string; percent: number | null }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
      <span>{text}</span>
      {percent !== null && (
        <span
          style={{
            display: 'block',
            height: 4,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.25)',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              display: 'block',
              height: '100%',
              width: `${percent}%`,
              background: '#fff',
            }}
          />
        </span>
      )}
    </span>
  );
}
