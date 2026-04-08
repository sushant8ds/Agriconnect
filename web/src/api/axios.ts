import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 (token expired) — use hash change to avoid full reload
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response?.data?.error || '';
      if (msg.includes('expired') || msg.includes('Invalid session')) {
        localStorage.clear();
        // Use hash navigation to avoid triggering a server request
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
