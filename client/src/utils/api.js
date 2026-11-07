import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to automatically attach Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('conceptcards_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry / unauthenticated events
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If server explicitly tells us the token is invalid or expired
      if (
        error.response.data?.message?.includes('token') ||
        error.response.data?.message?.includes('expired')
      ) {
        localStorage.removeItem('conceptcards_token');
        localStorage.removeItem('conceptcards_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// Modular API Client Service Methods
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

export const decksAPI = {
  getAll: (params) => api.get('/decks', { params }),
  getPublic: (params) => api.get('/decks/public', { params }),
  getOne: (id) => api.get(`/decks/${id}`),
  create: (data) => api.post('/decks', data),
  update: (id, data) => api.put(`/decks/${id}`, data),
  delete: (id) => api.delete(`/decks/${id}`),
  getBreadcrumbs: (id) => api.get(`/decks/${id}/breadcrumbs`),
  addCollaborator: (id, data) => api.post(`/decks/${id}/collaborators`, data),
  removeCollaborator: (id, userId) => api.delete(`/decks/${id}/collaborators/${userId}`),
  fork: (id) => api.post(`/decks/${id}/fork`),
};

export const cardsAPI = {
  getDeckCards: (deckId, params) => api.get(`/cards/deck/${deckId}`, { params }),
  getOne: (id) => api.get(`/cards/${id}`),
  create: (data) => api.post('/cards', data),
  update: (id, data) => api.put(`/cards/${id}`, data),
  delete: (id) => api.delete(`/cards/${id}`),
  checkDuplicate: (data) => api.post('/cards/check-duplicate', data),
  batchImport: (data) => api.post('/cards/batch-import', data),
};

export const studyAPI = {
  getDueCards: (deckId, params) => api.get(`/study/due/${deckId}`, { params }),
  getDueAll: (params) => api.get('/study/due-all', { params }),
  submitReview: (cardId, data) => api.post(`/study/review/${cardId}`, data),
  getDeckAnalytics: (deckId) => api.get(`/study/analytics/${deckId}`),
  getAnalyticsSummary: () => api.get('/study/analytics-summary'),
};

export default api;

