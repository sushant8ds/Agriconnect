import axios from 'axios';

// In production, VITE_API_URL points to the Render backend.
// In dev, it's empty so the Vite proxy handles /api/* → localhost:3000
const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
