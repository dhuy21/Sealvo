import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { renewAccessToken } from './api';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/env', () => ({ apiUrl: () => 'http://api.test' }));

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
});
