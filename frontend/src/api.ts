import axios from 'axios';

/**
 * Dev:  Vite proxy forwards /api → localhost:8000 (no CORS needed)
 * Prod: VITE_API_URL = https://your-backend.onrender.com  (set in Netlify env vars)
 */
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

const api = axios.create({ baseURL: API_BASE });

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data: {
    email: string; password: string;
    full_name?: string; experience_tier?: string; preferred_domains?: string[];
  }) => api.post('/auth/register', data),

  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  me: () => api.get('/auth/me'),
};

export const interviewApi = {
  start: (domain: string, tier?: string) =>
    api.post('/interviews/start', { domain, tier }),

  getQuestions: (interviewId: number, limit = 5) =>
    api.get(`/interviews/${interviewId}/questions?limit=${limit}`),

  submitAnswer: (interviewId: number, data: { question_id: number; transcript: string }) =>
    api.post(`/interviews/${interviewId}/answer`, data),

  complete: (interviewId: number, proctoring?: {
    tab_switches: number; fullscreen_exits: number;
    copy_paste_attempts: number; webcam_enabled: boolean;
    proctoring_flags?: Record<string, unknown>;
  }) => api.post(`/interviews/${interviewId}/complete`, proctoring || {}),

  history: () => api.get('/interviews/history'),
  get: (id: number) => api.get(`/interviews/${id}`),
};

export const dashboardApi = {
  get: () => api.get('/dashboard/'),
  credits: () => api.get('/dashboard/credits'),
};

export default api;
