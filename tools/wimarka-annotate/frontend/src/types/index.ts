export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  preferred_language: string;
  languages: string[];
  is_active: boolean;
  is_admin: boolean;
  is_evaluator: boolean;
  guidelines_seen: boolean;
  created_at: string;
}

export interface Sentence {
  id: number;
  source_text: string;
  machine_translation: string;
  reference_translation?: string;  // Reference/human translation for comparison
  tagalog_source_text?: string;
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
  text_type: 'machine';
  comment: string;
  error_type?: 'MI_ST' | 'MI_SE' | 'MA_ST' | 'MA_SE';
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
  final_form?: string;
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
  languages: string[];
  is_evaluator?: boolean;
}

export interface AnnotationCreate {
  sentence_id: number;
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality?: number;
  errors_found?: string;
  suggested_correction?: string;
  comments?: string;
  final_form?: string;
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
  final_form?: string;
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

// Machine Translation Quality Assessment interfaces
export interface MTQualityAssessment {
  id: number;
  sentence_id: number;
  evaluator_id: number;
  // Core quality scores (1-5 scale)
  fluency_score: number;           // How natural and grammatically correct
  adequacy_score: number;          // How well it conveys source meaning
  overall_quality_score: number;   // Overall translation quality
  
  // Error analysis (based on DistilBERT classification)
  syntax_errors: SyntaxError[];
  semantic_errors: SemanticError[];
  
  // Quality explanation (AI-generated)
  quality_explanation: string;
  correction_suggestions: string[];
  
  // Processing metadata
  model_confidence: number;        // DistilBERT confidence score
  processing_time_ms: number;      // Time taken for analysis
  time_spent_seconds: number;      // Human evaluator time
  
  // Human feedback (optional overrides)
  human_feedback?: string;         // Additional human feedback
  correction_notes?: string;       // Human correction notes
  
  evaluation_status: 'pending' | 'completed' | 'reviewed';
  created_at: string;
  updated_at: string;
  
  sentence: Sentence;
  evaluator: User;
}

export interface SyntaxError {
  error_type: 'grammar' | 'word_order' | 'punctuation' | 'capitalization';
  severity: 'minor' | 'major' | 'critical';
  start_position: number;
  end_position: number;
  text_span: string;
  description: string;
  suggested_fix?: string;
}

export interface SemanticError {
  error_type: 'mistranslation' | 'omission' | 'addition' | 'wrong_sense';
  severity: 'minor' | 'major' | 'critical';
  start_position: number;
  end_position: number;
  text_span: string;
  description: string;
  suggested_fix?: string;
}

export interface MTQualityCreate {
  sentence_id: number;
  // Optional manual overrides (if evaluator disagrees with AI)
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality_score?: number;
  
  // Additional human feedback
  human_feedback?: string;
  correction_notes?: string;
  time_spent_seconds?: number;
}

export interface MTQualityUpdate {
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality_score?: number;
  human_feedback?: string;
  correction_notes?: string;
  time_spent_seconds?: number;
  evaluation_status?: 'pending' | 'completed' | 'reviewed';
}

// Legacy evaluation interfaces (for backward compatibility)
export interface Evaluation {
  id: number;
  annotation_id: number;
  evaluator_id: number;
  annotation_quality_score?: number;
  accuracy_score?: number;
  completeness_score?: number;
  overall_evaluation_score?: number;
  feedback?: string;
  evaluation_notes?: string;
  time_spent_seconds?: number;
  evaluation_status: 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  annotation: Annotation;
  evaluator: User;
}

export interface EvaluationCreate {
  annotation_id: number;
  annotation_quality_score?: number;
  accuracy_score?: number;
  completeness_score?: number;
  overall_evaluation_score?: number;
  feedback?: string;
  evaluation_notes?: string;
  time_spent_seconds?: number;
}

export interface EvaluationUpdate {
  annotation_quality_score?: number;
  accuracy_score?: number;
  completeness_score?: number;
  overall_evaluation_score?: number;
  feedback?: string;
  evaluation_notes?: string;
  time_spent_seconds?: number;
  evaluation_status?: 'in_progress' | 'completed';
}

export interface EvaluatorStats {
  total_assessments: number;
  completed_assessments: number;
  pending_assessments: number;
  average_time_per_assessment: number;
  
  // Quality metrics
  average_fluency_score: number;
  average_adequacy_score: number;
  average_overall_score: number;
  
  // Error detection stats
  total_syntax_errors_found: number;
  total_semantic_errors_found: number;
  
  // Model performance
  average_model_confidence: number;
  human_agreement_rate: number;  // % of times human agrees with AI assessment
} 