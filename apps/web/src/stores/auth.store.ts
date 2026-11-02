import { create } from 'zustand';
import type { UserDto } from '@sealvo/shared';
import { setSignedInHint } from '@/lib/signed-in-hint';

export type User = UserDto;

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isReady: boolean;

  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  setReady: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isReady: false,

  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  // A login is known state: the startup restore may still be waiting for an unreachable API
  login: (user, accessToken) => {
    setSignedInHint(true);
    set({ user, accessToken, isAuthenticated: true, isReady: true });
  },
  logout: () => {
    setSignedInHint(false);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
  setReady: () => set({ isReady: true }),
}));
