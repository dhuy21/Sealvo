import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosResponse } from 'axios';
import api, { renewAccessToken } from './api';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/env', () => ({ apiUrl: () => 'http://api.test' }));

describe('request interceptor', () => {
  /** Resolves with the Authorization header the request was sent with */
  const sentAuthorization = (headers?: Record<string, string>) =>
    api
      .get('/me', {
        headers,
        adapter: async (config) => ({
          data: config.headers.Authorization,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }),
      })
      .then((res) => res.data);

  beforeEach(() => useAuthStore.getState().login({ id: 'u1' } as never, 'stored-token'));

  it('attaches the stored access token', async () => {
    await expect(sentAuthorization()).resolves.toBe('Bearer stored-token');
  });

  it('keeps an explicit Authorization header', async () => {
    await expect(sentAuthorization({ Authorization: 'Bearer fresh-token' })).resolves.toBe(
      'Bearer fresh-token',
    );
  });
});

describe('renewAccessToken', () => {
  beforeEach(() => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-token' } });
  });

  it('refreshes inside the cross-tab lock when the browser has Web Locks', async () => {
    const request = vi.fn((_name: string, callback: () => Promise<unknown>) => callback());
    vi.stubGlobal('navigator', { locks: { request } });

    await expect(renewAccessToken()).resolves.toBe('new-token');

    expect(request).toHaveBeenCalledWith('sealvo-refresh', expect.any(Function));
    expect(axios.post).toHaveBeenCalledWith('http://api.test/auth/refresh', null, {
      withCredentials: true,
      timeout: 15_000,
    });
    expect(useAuthStore.getState().accessToken).toBe('new-token');
  });

  it('refreshes directly without Web Locks', async () => {
    vi.stubGlobal('navigator', {});

    await expect(renewAccessToken()).resolves.toBe('new-token');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('shares one refresh between concurrent callers', async () => {
    vi.stubGlobal('navigator', {});

    await Promise.all([renewAccessToken(), renewAccessToken()]);
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  describe('when the refresh fails', () => {
    const user = { id: 'u1' } as never;
    beforeEach(() => {
      vi.stubGlobal('navigator', {});
      useAuthStore.getState().login(user, 'old-token');
    });

    it('logs out when the API rejects the refresh cookie', async () => {
      vi.mocked(axios.post).mockRejectedValue(
        new AxiosError('Unauthorized', '401', undefined, undefined, {
          status: 401,
        } as AxiosResponse),
      );

      await expect(renewAccessToken()).resolves.toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it.each([
      ['unreachable', new AxiosError('Network Error', 'ERR_NETWORK')],
      [
        'failing',
        new AxiosError('Bad Gateway', '502', undefined, undefined, {
          status: 502,
        } as AxiosResponse),
      ],
    ])('keeps the session when the API is %s', async (_case, error) => {
      vi.mocked(axios.post).mockRejectedValue(error);

      await expect(renewAccessToken()).resolves.toBeNull();
      expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, user });
    });
  });
});
