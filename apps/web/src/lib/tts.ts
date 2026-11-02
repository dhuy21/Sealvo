import api from '@/lib/api';

/** The audio was synthesized but the browser failed to play it. */
export class AudioPlaybackError extends Error {}

/**
 * Synthesizes `text` with `POST /tts/generate` and plays it.
 * Resolves when playback ends or is stopped by `signal`; rejects with `AudioPlaybackError`
 * if playback fails mid-way, or with the original error if the request or `play()` fails
 * (including a request cancelled by `signal`).
 */
export async function playTts(text: string, language: string, signal?: AbortSignal): Promise<void> {
  const { data } = await api.post<Blob>(
    '/tts/generate',
    { text, language },
    { responseType: 'blob', signal },
  );
  signal?.throwIfAborted();

  const audioUrl = URL.createObjectURL(data);
  const audio = new Audio(audioUrl);
  audio.volume = 0.8;

  let release = () => {};
  const finished = new Promise<void>((resolve, reject) => {
    const stop = () => {
      audio.pause();
      release();
      resolve();
    };
    release = () => {
      signal?.removeEventListener('abort', stop);
      URL.revokeObjectURL(audioUrl);
    };
    signal?.addEventListener('abort', stop, { once: true });
    audio.onended = () => {
      release();
      resolve();
    };
    audio.onerror = () => {
      release();
      reject(new AudioPlaybackError('Audio playback error'));
    };
  });

  try {
    await audio.play();
  } catch (error) {
    release();
    throw error;
  }
  return finished;
}
