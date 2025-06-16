from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    preferred_language: Optional[str] = None  # Keeping for backward compatibility
    languages: Optional[List[str]] = []  # New field for multiple languages

class UserCreate(UserBase):
    password: str
    is_evaluator: Optional[bool] = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserLanguageBase(BaseModel):
    language: str

class UserLanguageResponse(UserLanguageBase):
    id: int
    user_id: int

    model_config = {
        "from_attributes": True
    }

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    is_evaluator: bool = False
    guidelines_seen: bool
    created_at: datetime
    languages: List[str] = []  # Include the languages in the response

    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }
    
    @classmethod
    def from_orm(cls, obj):
        """Compatibility method for older code using from_orm"""
        # Create a dict from the model to avoid direct attribute access issues
        obj_dict = {
            "id": getattr(obj, "id", None),
            "email": getattr(obj, "email", ""),
            "username": getattr(obj, "username", ""),
            "first_name": getattr(obj, "first_name", ""),
            "last_name": getattr(obj, "last_name", ""),
            "preferred_language": getattr(obj, "preferred_language", ""),
            "is_active": getattr(obj, "is_active", True),
            "is_admin": getattr(obj, "is_admin", False),
            "is_evaluator": getattr(obj, "is_evaluator", False),
            "guidelines_seen": getattr(obj, "guidelines_seen", False),
            "created_at": getattr(obj, "created_at", datetime.utcnow())
        }
        
        # Extract language strings from UserLanguage objects
        languages = []
        if hasattr(obj, "languages") and obj.languages:
            for lang_obj in obj.languages:
                if hasattr(lang_obj, "language"):
                    languages.append(lang_obj.language)
                elif isinstance(lang_obj, str):
                    languages.append(lang_obj)
        
        # Create instance from dict
        instance = cls(**obj_dict)
        instance.languages = languages
        return instance

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Sentence schemas
class SentenceBase(BaseModel):
    source_text: str
    machine_translation: str
    source_language: str
    target_language: str
    domain: Optional[str] = None

class SentenceCreate(SentenceBase):
    pass

class SentenceResponse(SentenceBase):
    id: int
    created_at: datetime
    is_active: bool

    model_config = {
        "from_attributes": True
    }

# Text Highlight schemas
class TextHighlightBase(BaseModel):
    highlighted_text: str
    start_index: int
    end_index: int
    text_type: str  # 'machine' only
    comment: str

class TextHighlightCreate(TextHighlightBase):
    pass

class TextHighlightResponse(TextHighlightBase):
    id: int
    annotation_id: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

# Annotation schemas
class AnnotationBase(BaseModel):
    fluency_score: Optional[int] = None
    adequacy_score: Optional[int] = None
    overall_quality: Optional[int] = None
    errors_found: Optional[str] = None  # Legacy field
    suggested_correction: Optional[str] = None  # Legacy field
    comments: Optional[str] = None  # General comments
    final_form: Optional[str] = None  # Final corrected form of the sentence
    time_spent_seconds: Optional[int] = None

class AnnotationCreate(AnnotationBase):
    sentence_id: int
    highlights: Optional[List[TextHighlightCreate]] = []  # New highlight-based annotations

class AnnotationUpdate(AnnotationBase):
    annotation_status: Optional[str] = None
    highlights: Optional[List[TextHighlightCreate]] = None  # Allow updating highlights

class AnnotationResponse(AnnotationBase):
    id: int
    sentence_id: int
    annotator_id: int
    annotation_status: str
    created_at: datetime
    updated_at: datetime
    sentence: SentenceResponse
    annotator: UserResponse
    highlights: List[TextHighlightResponse] = []  # Include highlights in response

    model_config = {
        "from_attributes": True
    }

# Legacy annotation schemas for backward compatibility
class LegacyAnnotationCreate(AnnotationBase):
    sentence_id: int

class LegacyAnnotationResponse(AnnotationBase):
    id: int
    sentence_id: int
    annotator_id: int
    annotation_status: str
    created_at: datetime
    updated_at: datetime
    sentence: SentenceResponse
    annotator: UserResponse

    model_config = {
        "from_attributes": True
    }

# Admin schemas
class AdminStats(BaseModel):
    total_users: int
    total_sentences: int
    total_annotations: int
    completed_annotations: int
    active_users: int

# Evaluation schemas
class EvaluationBase(BaseModel):
    annotation_quality_score: Optional[int] = None
    accuracy_score: Optional[int] = None
    completeness_score: Optional[int] = None
    overall_evaluation_score: Optional[int] = None
    feedback: Optional[str] = None
    evaluation_notes: Optional[str] = None
    time_spent_seconds: Optional[int] = None

class EvaluationCreate(EvaluationBase):
    annotation_id: int

class EvaluationUpdate(EvaluationBase):
    evaluation_status: Optional[str] = None

class EvaluationResponse(EvaluationBase):
    id: int
    annotation_id: int
    evaluator_id: int
    evaluation_status: str
    created_at: datetime
    updated_at: datetime
    annotation: AnnotationResponse
    evaluator: UserResponse

    model_config = {
        "from_attributes": True
    }

# Evaluator stats schema
class EvaluatorStats(BaseModel):
    total_evaluations: int
    completed_evaluations: int
    pending_evaluations: int
    average_time_per_evaluation: float

class UserStats(BaseModel):
    user: UserResponse
    total_annotations: int
    completed_annotations: int
    average_time_per_annotation: float