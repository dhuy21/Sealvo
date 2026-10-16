import { isAxiosError } from 'axios';

/** Error message sent by the API. NestJS validation errors return `message` as an array. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError<{ message?: string | string[] }>(err)) return fallback;
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ') || fallback;
  return message || fallback;
}
