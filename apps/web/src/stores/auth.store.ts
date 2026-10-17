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
  login: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setReady: () => set({ isReady: true }),
}));
