import { isAxiosError } from 'axios';

/** Error message sent by the API. NestJS validation errors return `message` as an array. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError<{ message?: string | string[] }>(err)) return fallback;
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ') || fallback;
  return message || fallback;
}

/** `code` of an API error body (API_ERROR_CODES), for the errors the UI reacts to */
export function getApiErrorCode(err: unknown): string | undefined {
  return isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined;
}
