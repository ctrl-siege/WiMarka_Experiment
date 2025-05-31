export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  preferred_language: string;
  is_active: boolean;
  is_admin: boolean;
  guidelines_seen: boolean;
  created_at: string;
}

export interface Sentence {
  id: number;
  source_text: string;
  machine_translation: string;
  reference_translation?: string;
  source_language: string;
  target_language: string;
  domain?: string;
  created_at: string;
  is_active: boolean;
}

export interface TextHighlight {
  id?: number;
  annotation_id?: number;
  highlighted_text: string;
  start_index: number;
  end_index: number;
  text_type: 'machine' | 'reference';
  highlight_type: 'error' | 'suggestion' | 'note';
  comment: string;
  created_at?: string;
}

export interface Annotation {
  id: number;
  sentence_id: number;
  annotator_id: number;
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality?: number;
  errors_found?: string;
  suggested_correction?: string;
  comments?: string;
  time_spent_seconds?: number;
  annotation_status: 'in_progress' | 'completed' | 'reviewed';
  created_at: string;
  updated_at: string;
  sentence: Sentence;
  annotator: User;
  highlights: TextHighlight[];
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  preferred_language: string;
}

export interface AnnotationCreate {
  sentence_id: number;
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality?: number;
  errors_found?: string;
  suggested_correction?: string;
  comments?: string;
  time_spent_seconds?: number;
  highlights?: TextHighlight[];
}

export interface AnnotationUpdate {
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality?: number;
  errors_found?: string;
  suggested_correction?: string;
  comments?: string;
  time_spent_seconds?: number;
  annotation_status?: 'in_progress' | 'completed' | 'reviewed';
  highlights?: TextHighlight[];
}

// Legacy interfaces for backward compatibility
export interface LegacyAnnotationCreate {
  sentence_id: number;
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality?: number;
  errors_found?: string;
  suggested_correction?: string;
  comments?: string;
  time_spent_seconds?: number;
}

export interface AdminStats {
  total_users: number;
  total_sentences: number;
  total_annotations: number;
  completed_annotations: number;
  active_users: number;
} 