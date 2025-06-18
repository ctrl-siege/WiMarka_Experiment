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
  Evaluation,
  EvaluationCreate,
  EvaluationUpdate,
  EvaluatorStats,
  MTQualityAssessment,
  MTQualityCreate,
  MTQualityUpdate,
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
      // Only redirect to login if not already on login/register pages
      const currentPath = window.location.pathname;
      const isOnAuthPage = currentPath === '/login' || currentPath === '/register';
      
      authStorage.removeToken();
      authStorage.removeUser();
      
      // Only redirect if user is not already on an auth page
      if (!isOnAuthPage) {
        window.location.href = '/login';
      }
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

  deleteAnnotation: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/annotations/${id}`);
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

  getAdminSentences: async (skip = 0, limit = 100, targetLanguage?: string, sourceLanguage?: string): Promise<Sentence[]> => {
    let url = `/admin/sentences?skip=${skip}&limit=${limit}`;
    if (targetLanguage) url += `&target_language=${targetLanguage}`;
    if (sourceLanguage) url += `&source_language=${sourceLanguage}`;
    const response = await api.get(url);
    return response.data;
  },

  getSentenceCountsByLanguage: async (): Promise<{[key: string]: number}> => {
    const response = await api.get('/admin/sentences/counts');
    return response.data;
  },

  getSentenceAnnotations: async (sentenceId: number): Promise<Annotation[]> => {
    const response = await api.get(`/admin/sentences/${sentenceId}/annotations`);
    return response.data;
  },

  toggleEvaluatorRole: async (userId: number): Promise<User> => {
    const response = await api.put(`/admin/users/${userId}/toggle-evaluator`);
    return response.data;
  },
};

// Machine Translation Quality Assessment API
export const mtQualityAPI = {
  // Get sentences pending MT quality assessment
  getPendingAssessments: async (skip = 0, limit = 50): Promise<Sentence[]> => {
    const response = await api.get(`/mt-quality/pending?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Create MT quality assessment (AI-powered analysis)
  createAssessment: async (assessmentData: MTQualityCreate): Promise<MTQualityAssessment> => {
    const response = await api.post('/mt-quality/assess', assessmentData);
    return response.data;
  },

  // Update assessment with human feedback
  updateAssessment: async (id: number, updateData: MTQualityUpdate): Promise<MTQualityAssessment> => {
    const response = await api.put(`/mt-quality/${id}`, updateData);
    return response.data;
  },

  // Get evaluator's assessments
  getMyAssessments: async (skip = 0, limit = 100): Promise<MTQualityAssessment[]> => {
    const response = await api.get(`/mt-quality/my-assessments?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Get evaluator statistics
  getEvaluatorStats: async (): Promise<EvaluatorStats> => {
    const response = await api.get('/mt-quality/stats');
    return response.data;
  },

  // Get all assessments (admin)
  getAllAssessments: async (skip = 0, limit = 100): Promise<MTQualityAssessment[]> => {
    const response = await api.get(`/admin/mt-quality?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Get assessment details by sentence ID
  getAssessmentBySentence: async (sentenceId: number): Promise<MTQualityAssessment | null> => {
    try {
      const response = await api.get(`/mt-quality/sentence/${sentenceId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  // Batch process sentences for quality assessment
  batchAssess: async (sentenceIds: number[]): Promise<MTQualityAssessment[]> => {
    const response = await api.post('/mt-quality/batch-assess', { sentence_ids: sentenceIds });
    return response.data;
  },
};

// Legacy Evaluations API (for backward compatibility)
export const evaluationsAPI = {
  createEvaluation: async (evaluationData: EvaluationCreate): Promise<Evaluation> => {
    const response = await api.post('/evaluations', evaluationData);
    return response.data;
  },

  updateEvaluation: async (id: number, evaluationData: EvaluationUpdate): Promise<Evaluation> => {
    const response = await api.put(`/evaluations/${id}`, evaluationData);
    return response.data;
  },

  getMyEvaluations: async (skip = 0, limit = 100): Promise<Evaluation[]> => {
    const response = await api.get(`/evaluations?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getPendingEvaluations: async (skip = 0, limit = 50): Promise<Annotation[]> => {
    const response = await api.get(`/evaluations/pending?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getEvaluatorStats: async (): Promise<EvaluatorStats> => {
    const response = await api.get('/evaluator/stats');
    return response.data;
  },

  getAllEvaluations: async (skip = 0, limit = 100): Promise<Evaluation[]> => {
    const response = await api.get(`/admin/evaluations?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getAnnotationEvaluations: async (annotationId: number): Promise<Evaluation[]> => {
    const response = await api.get(`/annotations/${annotationId}/evaluations`);
    return response.data;
  },
};

export default api;