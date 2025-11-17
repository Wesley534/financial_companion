// frontend/src/api/client.ts

import axios from 'axios';

// Get the API URL from the Vite environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// A utility function to set the JWT token for authenticated requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Check for existing token on startup
const storedToken = localStorage.getItem('access_token');
if (storedToken) {
    setAuthToken(storedToken);
}

export default apiClient;