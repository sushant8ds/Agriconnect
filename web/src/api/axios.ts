import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response?.data?.error || '';
      if (msg.includes('expired') || msg.includes('Invalid session')) {
        localStorage.clear();
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
