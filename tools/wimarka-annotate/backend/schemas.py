from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    preferred_language: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    guidelines_seen: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Sentence schemas
class SentenceBase(BaseModel):
    source_text: str
    machine_translation: str
    reference_translation: Optional[str] = None
    source_language: str
    target_language: str
    domain: Optional[str] = None

class SentenceCreate(SentenceBase):
    pass

class SentenceResponse(SentenceBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# Text Highlight schemas
class TextHighlightBase(BaseModel):
    highlighted_text: str
    start_index: int
    end_index: int
    text_type: str  # 'machine' or 'reference'
    highlight_type: str  # 'error', 'suggestion', 'note'
    comment: str

class TextHighlightCreate(TextHighlightBase):
    pass

class TextHighlightResponse(TextHighlightBase):
    id: int
    annotation_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Annotation schemas
class AnnotationBase(BaseModel):
    fluency_score: Optional[int] = None
    adequacy_score: Optional[int] = None
    overall_quality: Optional[int] = None
    errors_found: Optional[str] = None  # Legacy field
    suggested_correction: Optional[str] = None  # Legacy field
    comments: Optional[str] = None  # General comments
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

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

# Admin schemas
class AdminStats(BaseModel):
    total_users: int
    total_sentences: int
    total_annotations: int
    completed_annotations: int
    active_users: int

class UserStats(BaseModel):
    user: UserResponse
    total_annotations: int
    completed_annotations: int
    average_time_per_annotation: float 