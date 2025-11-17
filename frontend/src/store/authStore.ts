// frontend/src/store/authStore.ts

import { create } from 'zustand';
import { setAuthToken } from '../api/client'; // <--- ADD THIS IMPORT


interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initialize state from localStorage
  token: localStorage.getItem('access_token'),
  user: null, // User is fetched on app load or login
  isAuthenticated: !!localStorage.getItem('access_token'),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem('access_token');
      set({ token: null, isAuthenticated: false });
    }
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('access_token');
    // Clear Auth header in the API client
    setAuthToken(null); 
    set({ token: null, user: null, isAuthenticated: false });
  },
}));