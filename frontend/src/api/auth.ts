// frontend/src/api/auth.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { setAuthToken } from './client';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';

// --- Schemas (matching backend Pydantic models) ---
export const UserInSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type UserIn = z.infer<typeof UserInSchema>;

// --- User Output ---
export interface UserOut {
  id: number;
  name: string;
  email: string;
  is_setup_complete: boolean; // Critical for setup wizard
  currency?: string;          // Optional non-sensitive fields
}

// --- Token Response ---
interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ----------------- API FUNCTIONS -----------------

// Register user
const registerUser = async (data: UserIn): Promise<UserOut> => {
  const response = await apiClient.post<UserOut>('/auth/register', data);
  return response.data;
};

// Login user
const loginUser = async (data: Omit<UserIn, 'name'>): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>('/auth/login', data);
  return response.data;
};

// Fetch current user
const fetchUserMe = async (): Promise<UserOut> => {
  const response = await apiClient.get<UserOut>('/auth/me');
  return response.data;
};

// ----------------- REACT QUERY HOOKS -----------------

// Hook to fetch user data
export const useUserQuery = (options?: any) => {
  const { token, setUser, logout } = useAuthStore();

  const queryKey = options?.queryKey ?? ['user'];
  const enabled = !!token && (options?.enabled ?? true);

  return useQuery<UserOut>({
    queryKey,
    queryFn: fetchUserMe,
    enabled,
    staleTime: Infinity,
    onSuccess: (data: UserOut) => {
      console.debug('[useUserQuery] fetched /me', data);
      setUser(data);
      if (options?.onSuccess) options.onSuccess(data);
    },
    onError: (err: unknown) => {
      console.error('[useUserQuery] fetch user failed', err);
      if (token) logout(); // Clear invalid token
      if (options?.onError) options.onError(err);
    },
    ...options,
  });
};

// Hook for registration
export const useRegisterMutation = () => {
  return useMutation<UserOut, unknown, UserIn>({
    mutationFn: registerUser,
  });
};

// Hook for login
export const useLoginMutation = () => {
  const { setToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<TokenResponse, unknown, Omit<UserIn, 'name'>>({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // 1️⃣ Save token in store and axios
      setToken(data.access_token);
      setAuthToken(data.access_token);

      // 2️⃣ Refetch user immediately to populate store
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};
