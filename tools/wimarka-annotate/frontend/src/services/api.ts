import axios from 'axios';
import type {
  User,
  Sentence,
  Annotation,
  AuthToken,
  LoginCredentials,
  RegisterData,
  AnnotationCreate,
  AnnotationUpdate,
  AdminStats,
} from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Auth storage
export const authStorage = {
  getToken: () => localStorage.getItem('access_token'),
  setToken: (token: string) => localStorage.setItem('access_token', token),
  removeToken: () => localStorage.removeItem('access_token'),
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  setUser: (user: User) => localStorage.setItem('user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('user'),
};

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStorage.removeToken();
      authStorage.removeUser();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthToken> => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<AuthToken> => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/me');
    return response.data;
  },

  markGuidelinesSeen: async (): Promise<User> => {
    const response = await api.put('/me/guidelines-seen');
    return response.data;
  },
};

// Sentences API
export const sentencesAPI = {
  getSentences: async (skip = 0, limit = 100): Promise<Sentence[]> => {
    const response = await api.get(`/sentences?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getSentence: async (id: number): Promise<Sentence> => {
    const response = await api.get(`/sentences/${id}`);
    return response.data;
  },

  getNextSentence: async (): Promise<Sentence | null> => {
    const response = await api.get('/sentences/next');
    return response.data;
  },

  getUnannotatedSentences: async (skip = 0, limit = 50): Promise<Sentence[]> => {
    const response = await api.get(`/sentences/unannotated?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  createSentence: async (sentenceData: Omit<Sentence, 'id' | 'created_at' | 'is_active'>): Promise<Sentence> => {
    const response = await api.post('/sentences', sentenceData);
    return response.data;
  },

  bulkCreateSentences: async (sentencesData: Omit<Sentence, 'id' | 'created_at' | 'is_active'>[]): Promise<Sentence[]> => {
    const response = await api.post('/admin/sentences/bulk', sentencesData);
    return response.data;
  },
};

// Annotations API
export const annotationsAPI = {
  createAnnotation: async (annotationData: AnnotationCreate): Promise<Annotation> => {
    const response = await api.post('/annotations', annotationData);
    return response.data;
  },

  updateAnnotation: async (id: number, annotationData: AnnotationUpdate): Promise<Annotation> => {
    const response = await api.put(`/annotations/${id}`, annotationData);
    return response.data;
  },

  getMyAnnotations: async (skip = 0, limit = 100): Promise<Annotation[]> => {
    const response = await api.get(`/annotations?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getAllAnnotations: async (skip = 0, limit = 100): Promise<Annotation[]> => {
    const response = await api.get(`/admin/annotations?skip=${skip}&limit=${limit}`);
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getAllUsers: async (skip = 0, limit = 100): Promise<User[]> => {
    const response = await api.get(`/admin/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },
};

export default api; 