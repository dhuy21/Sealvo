import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosResponse } from 'axios';
import api from './api';
import { restoreSession } from './restore-session';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/env', () => ({ apiUrl: () => 'http://api.test' }));

const httpError = (status: number) =>
  new AxiosError(String(status), String(status), undefined, undefined, {
    status,
  } as AxiosResponse);

describe('restoreSession', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-token' } });
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 'u1' } });
  });

  it('restores the user behind a valid refresh cookie', async () => {
    await expect(restoreSession()).resolves.toEqual({
      status: 'restored',
      user: { id: 'u1' },
      token: 'new-token',
    });
  });

  it('ends the session when the API rejects the refresh cookie', async () => {
    vi.mocked(axios.post).mockRejectedValue(httpError(401));
    await expect(restoreSession()).resolves.toEqual({ status: 'ended' });
  });

  it.each([
    ['unreachable', new AxiosError('Network Error', 'ERR_NETWORK')],
    ['failing', httpError(503)],
    ['rate limiting', httpError(429)],
  ])('reports the API as unreachable, not logged out, when it is %s', async (_case, error) => {
    vi.mocked(axios.post).mockRejectedValue(error);
    await expect(restoreSession()).resolves.toEqual({ status: 'unreachable' });
  });

  it('tells a failing profile request (outage) from a missing account', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(httpError(502));
    await expect(restoreSession()).resolves.toEqual({ status: 'unreachable' });

    vi.mocked(api.get).mockRejectedValueOnce(httpError(404));
    await expect(restoreSession()).resolves.toEqual({ status: 'ended' });
  });
});
