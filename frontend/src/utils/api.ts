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

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  timestamp?: string;
  uptimeSeconds?: number;
  environment?: string;
  responseTimeMs?: number;
  services?: {
    database?: { status: 'ok' | 'error'; message?: string; latencyMs?: number };
    qdrant?: { status: 'ok' | 'error'; message?: string; latencyMs?: number };
    jwt?: { status: string };
  };
  errorMessage?: string;
}

export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  try {
    const res = await api.get<HealthCheckResponse>('/health', { timeout: 5000 });
    return res.data;
  } catch (err: any) {
    return {
      status: 'offline',
      errorMessage: err.response?.data?.error || err.message || 'Backend server is unreachable',
    };
  }
}

export { apiBaseUrl };
export default api;