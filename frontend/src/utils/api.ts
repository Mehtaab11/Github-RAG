import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_BACKEND_URL
    ? process.env.NEXT_PUBLIC_BACKEND_URL
    : "http://localhost:5000");

const cleanApiUrl = rawApiUrl.replace(/\/$/, "");
const apiBaseUrl = cleanApiUrl.endsWith("/api")
  ? cleanApiUrl
  : `${cleanApiUrl}/api`;

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

// Interceptor automatically injects the current Zustand token into every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor bounces users out strictly if their authentication token has expired / is invalid (401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register');

    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated) {
        authState.logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;