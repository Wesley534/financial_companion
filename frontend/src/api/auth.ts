// frontend/src/api/auth.ts

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import apiClient, { setAuthToken } from './client';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';

// --- Schemas (Matching Backend Pydantic Models) ---
export const UserInSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type UserIn = z.infer<typeof UserInSchema>;

export interface UserOut {
    id: number;
    name: string;
    email: string;
}

interface TokenResponse {
    access_token: string;
    token_type: string;
}

// --- API Functions ---

// 1. Register
const registerUser = async (data: UserIn): Promise<UserOut> => {
  const response = await apiClient.post<UserOut>('/auth/register', data);
  return response.data;
};

// 2. Login
const loginUser = async (data: Omit<UserIn, 'name'>): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>('/auth/login', data);
  return response.data;
};

// 3. Fetch User (Me)
const fetchUserMe = async (): Promise<UserOut> => {
    const response = await apiClient.get<UserOut>('/auth/me');
    return response.data;
}


// --- React Query Hooks ---

// Hook to check if the token is valid and fetch user data
export const useUserQuery = () => {
    const { token, setUser, setToken, logout } = useAuthStore();
    return useQuery<UserOut>({
        queryKey: ['me'],
        queryFn: fetchUserMe,
        enabled: !!token, // Only run the query if a token exists
        staleTime: Infinity, // User info doesn't change often
        onSuccess: (data) => {
            setUser(data);
        },
        onError: () => {
            // If fetching /me fails (token expired/invalid), log out
            if (token) {
                console.error("Token invalid, logging out.");
                logout(); 
            }
        }
    });
}

// Hook for Register mutation
export const useRegisterMutation = () => {
    return useMutation({
        mutationFn: registerUser,
    });
};

// Hook for Login mutation
export const useLoginMutation = () => {
    const { setToken, setUser } = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: loginUser,
        onSuccess: (data) => {
            // 1. Store the token in Zustand/localStorage and set the Axios header
            setAuthToken(data.access_token);
            setToken(data.access_token);

            // 2. Invalidate the 'me' query to fetch the new user details immediately
            queryClient.invalidateQueries({ queryKey: ['me'] }); 
        },
    });
};