import { create } from 'zustand';
import { setAuthToken } from '../api/client';
import type { UserOut } from '../api/auth';
import apiClient from '../api/client';

interface AuthState {
  token: string | null;
  user: UserOut | null;
  isAuthenticated: boolean;

  setToken: (token: string | null) => void;
  setUser: (user: UserOut | null) => void;
  logout: () => void;
  loadUser: () => Promise<void>; // <-- NEW
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('access_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
      set({ token, isAuthenticated: true });
      setAuthToken(token);
    } else {
      localStorage.removeItem('access_token');
      set({ token: null, isAuthenticated: false, user: null });
      setAuthToken(null);
    }
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('access_token');
    set({ token: null, user: null, isAuthenticated: false });
    setAuthToken(null);
  },

  loadUser: async () => {
    const token = get().token;
    if (!token) return;

    try {
      setAuthToken(token); // ensure Axios has the header
      const response = await apiClient.get<UserOut>('/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (err) {
      console.error('Failed to rehydrate user after refresh:', err);
      get().logout();
    }
  },
}));
