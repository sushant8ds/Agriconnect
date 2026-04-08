import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL,
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiClient;
