import axios from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const baseURL = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`)
  : '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token for cross-origin deployments (e.g. Vercel frontend + Render backend)
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hearth-token') : null;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-store session token when returned in responses, and clear on 401
api.interceptors.response.use(
  (response) => {
    if (response?.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('hearth-token', response.data.token);
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hearth-token');
    }
    return Promise.reject(error);
  }
);

export function messageFromError(error) {
  return error?.response?.data?.error?.message || error?.message || 'Something went wrong. Please try again.';
}
