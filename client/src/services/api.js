import axios from 'axios';
export const api = axios.create({ baseURL: '/api', withCredentials: true, headers: { 'Content-Type': 'application/json' } });
export function messageFromError(error) { return error?.response?.data?.error?.message || error?.message || 'Something went wrong. Please try again.'; }
