import { create } from 'zustand';
import type { UserDto } from '@sealvo/shared';

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
  login: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isReady: true }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setReady: () => set({ isReady: true }),
}));
