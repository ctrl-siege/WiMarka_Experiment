from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List, Optional
import json

from database import get_db, create_tables, User, Sentence, Annotation, TextHighlight, UserLanguage, Evaluation
from auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash, 
    get_current_user, 
    get_current_admin_user,
    get_current_evaluator_user,
    get_current_admin_or_evaluator_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from schemas import (
    UserCreate, 
    UserLogin, 
    UserResponse, 
    Token,
    SentenceCreate,
    SentenceResponse,
    AnnotationCreate,
    AnnotationUpdate,
    AnnotationResponse,
    LegacyAnnotationCreate,
    LegacyAnnotationResponse,
    TextHighlightCreate,
    TextHighlightResponse,
    EvaluationCreate,
    EvaluationUpdate,
    EvaluationResponse,
    AdminStats,
    UserStats,
    EvaluatorStats
)

app = FastAPI(title="WiMarka - Annotation Tool", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def startup_event():
    create_tables()

# Authentication endpoints
@app.post("/api/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        preferred_language=user_data.preferred_language if user_data.preferred_language else user_data.languages[0] if user_data.languages else "tagalog",
        hashed_password=hashed_password,
        is_evaluator=getattr(user_data, 'is_evaluator', False)
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Add user languages if specified
    if user_data.languages and len(user_data.languages) > 0:
        for language in user_data.languages:
            user_language = UserLanguage(user_id=db_user.id, language=language)
            db.add(user_language)
        db.commit()
    # If no languages specified but preferred_language is set, use that
    elif user_data.preferred_language:
        user_language = UserLanguage(user_id=db_user.id, language=user_data.preferred_language)
        db.add(user_language)
        db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    # Refresh user to ensure we have the latest data including languages relationship
    db.refresh(db_user)
    
    # Create a response with user data
    user_response = UserResponse.from_orm(db_user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.post("/api/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Create a response with user data and languages
    # UserResponse.from_orm now handles languages conversion properly
    user_data = UserResponse.from_orm(user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

def get_user_languages(db: Session, user_id: int):
    """Helper function to get a user's languages"""
    languages = db.query(UserLanguage.language).filter(UserLanguage.user_id == user_id).all()
    return [language[0] for language in languages]

def convert_user_to_response(db: Session, user: User) -> UserResponse:
    """Helper function to convert a User model to UserResponse with proper language strings"""
    # Since UserResponse.from_orm now properly handles language extraction, we can use it directly
    return UserResponse.from_orm(user)

@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Return user data with properly extracted languages
    return UserResponse.from_orm(current_user)

@app.put("/api/me/guidelines-seen", response_model=UserResponse)
def mark_guidelines_seen(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.guidelines_seen = True
    db.commit()
    db.refresh(current_user)
    
    # Process the user to ensure languages are properly handled
    return convert_user_to_response(db, current_user)

# Sentence management endpoints
@app.post("/api/sentences", response_model=SentenceResponse)
def create_sentence(
    sentence_data: SentenceCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_sentence = Sentence(**sentence_data.dict())
    db.add(db_sentence)
    db.commit()
    db.refresh(db_sentence)
    return db_sentence

@app.get("/api/sentences", response_model=List[SentenceResponse])
def get_sentences(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sentences = db.query(Sentence).filter(Sentence.is_active == True).offset(skip).limit(limit).all()
    return sentences

# Get next sentence for annotation
@app.get("/api/sentences/next", response_model=Optional[SentenceResponse])
def get_next_sentence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find sentences that haven't been annotated by this user and match their preferred language
    next_sentence = db.query(Sentence).filter(
        Sentence.is_active == True,
        Sentence.target_language == current_user.preferred_language
    ).filter(
        ~db.query(Annotation).filter(
            Annotation.sentence_id == Sentence.id,
            Annotation.annotator_id == current_user.id
        ).exists()
    ).first()
    
    return next_sentence

# Get multiple unannotated sentences for sheet view
@app.get("/api/sentences/unannotated", response_model=List[SentenceResponse])
def get_unannotated_sentences(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find sentences that haven't been annotated by this user and match their preferred language
    unannotated_sentences = db.query(Sentence).filter(
        Sentence.is_active == True,
        Sentence.target_language == current_user.preferred_language
    ).filter(
        ~db.query(Annotation).filter(
            Annotation.sentence_id == Sentence.id,
            Annotation.annotator_id == current_user.id
        ).exists()
    ).offset(skip).limit(limit).all()
    
    return unannotated_sentences

@app.get("/api/sentences/{sentence_id}", response_model=SentenceResponse)
def get_sentence(
    sentence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sentence = db.query(Sentence).filter(Sentence.id == sentence_id).first()
    if not sentence:
        raise HTTPException(status_code=404, detail="Sentence not found")
    return sentence

# Annotation endpoints
@app.post("/api/annotations", response_model=AnnotationResponse)
def create_annotation(
    annotation_data: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user already annotated this sentence
    existing_annotation = db.query(Annotation).filter(
        Annotation.sentence_id == annotation_data.sentence_id,
        Annotation.annotator_id == current_user.id
    ).first()
    
    if existing_annotation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already annotated this sentence"
        )
    
    # Create the main annotation
    annotation_dict = annotation_data.model_dump(exclude={'highlights'})
    db_annotation = Annotation(
        **annotation_dict,
        annotator_id=current_user.id,
        annotation_status="completed"
    )
    
    db.add(db_annotation)
    db.flush()  # Flush to get the annotation ID
    
    # Create associated highlights (deduplicate by start_index, end_index, text_type, comment)
    if annotation_data.highlights:
        unique_highlights = []
        seen = set()
        for h in annotation_data.highlights:
            key = (h.start_index, h.end_index, h.text_type, h.comment)
            if key not in seen:
                seen.add(key)
                unique_highlights.append(h)
        for highlight_data in unique_highlights:
            db_highlight = TextHighlight(
                annotation_id=db_annotation.id,
                highlighted_text=highlight_data.highlighted_text,
                start_index=highlight_data.start_index,
                end_index=highlight_data.end_index,
                text_type=highlight_data.text_type,
                comment=highlight_data.comment
            )
            db.add(db_highlight)
    
    db.commit()
    db.refresh(db_annotation)
    
    # Return properly formatted response
    return {
        "id": db_annotation.id,
        "sentence_id": db_annotation.sentence_id,
        "annotator_id": db_annotation.annotator_id,
        "annotation_status": db_annotation.annotation_status,
        "created_at": db_annotation.created_at,
        "updated_at": db_annotation.updated_at,
        "fluency_score": db_annotation.fluency_score,
        "adequacy_score": db_annotation.adequacy_score,
        "overall_quality": db_annotation.overall_quality,
        "errors_found": db_annotation.errors_found,
        "suggested_correction": db_annotation.suggested_correction,
        "comments": db_annotation.comments,
        "final_form": db_annotation.final_form,
        "time_spent_seconds": db_annotation.time_spent_seconds,
        "sentence": db_annotation.sentence,
        "annotator": UserResponse.from_orm(db_annotation.annotator),
        "highlights": db_annotation.highlights or []
    }

# Legacy annotation endpoint for backward compatibility
@app.post("/api/annotations/legacy", response_model=LegacyAnnotationResponse)
def create_legacy_annotation(
    annotation_data: LegacyAnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user already annotated this sentence
    existing_annotation = db.query(Annotation).filter(
        Annotation.sentence_id == annotation_data.sentence_id,
        Annotation.annotator_id == current_user.id
    ).first()
    
    if existing_annotation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already annotated this sentence"
        )
    
    db_annotation = Annotation(
        **annotation_data.model_dump(),
        annotator_id=current_user.id,
        annotation_status="completed"
    )
    
    db.add(db_annotation)    
    db.commit()
    db.refresh(db_annotation)
    
    # Return properly formatted response
    return {
        "id": db_annotation.id,
        "sentence_id": db_annotation.sentence_id,
        "annotator_id": db_annotation.annotator_id,
        "annotation_status": db_annotation.annotation_status,
        "created_at": db_annotation.created_at,
        "updated_at": db_annotation.updated_at,
        "fluency_score": db_annotation.fluency_score,
        "adequacy_score": db_annotation.adequacy_score,
        "overall_quality": db_annotation.overall_quality,
        "errors_found": db_annotation.errors_found,
        "suggested_correction": db_annotation.suggested_correction,
        "comments": db_annotation.comments,
        "final_form": db_annotation.final_form,
        "time_spent_seconds": db_annotation.time_spent_seconds,
        "sentence": db_annotation.sentence,
        "annotator": UserResponse.from_orm(db_annotation.annotator)
    }

@app.put("/api/annotations/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: int,
    annotation_data: AnnotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    annotation = db.query(Annotation).filter(
        Annotation.id == annotation_id,
        Annotation.annotator_id == current_user.id
    ).first()
    
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    # Update annotation fields
    update_data = annotation_data.model_dump(exclude_unset=True, exclude={'highlights'})
    for field, value in update_data.items():
        setattr(annotation, field, value)
    
    # Update highlights if provided (deduplicate)
    if annotation_data.highlights is not None:
        db.query(TextHighlight).filter(TextHighlight.annotation_id == annotation_id).delete()
        unique_highlights = []
        seen = set()
        for h in annotation_data.highlights:
            key = (h.start_index, h.end_index, h.text_type, h.comment)
            if key not in seen:
                seen.add(key)
                unique_highlights.append(h)
        for highlight_data in unique_highlights:
            db_highlight = TextHighlight(
                annotation_id=annotation_id,
                highlighted_text=highlight_data.highlighted_text,
                start_index=highlight_data.start_index,
                end_index=highlight_data.end_index,
                text_type=highlight_data.text_type,
                comment=highlight_data.comment
            )
            db.add(db_highlight)
    
    db.commit()
    db.refresh(annotation)
    
    # Return properly formatted response
    return {
        "id": annotation.id,
        "sentence_id": annotation.sentence_id,
        "annotator_id": annotation.annotator_id,
        "annotation_status": annotation.annotation_status,
        "created_at": annotation.created_at,
        "updated_at": annotation.updated_at,
        "fluency_score": annotation.fluency_score,
        "adequacy_score": annotation.adequacy_score,
        "overall_quality": annotation.overall_quality,
        "errors_found": annotation.errors_found,
        "suggested_correction": annotation.suggested_correction,
        "comments": annotation.comments,
        "final_form": annotation.final_form,
        "time_spent_seconds": annotation.time_spent_seconds,
        "sentence": annotation.sentence,
        "annotator": UserResponse.from_orm(annotation.annotator),
        "highlights": annotation.highlights or []
    }

@app.get("/api/annotations", response_model=List[AnnotationResponse])
def get_my_annotations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    annotations = db.query(Annotation).filter(
        Annotation.annotator_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    # Convert to proper response format to handle language serialization
    response_annotations = []
    for annotation in annotations:
        # Create annotation dict
        annotation_dict = {
            "id": annotation.id,
            "sentence_id": annotation.sentence_id,
            "annotator_id": annotation.annotator_id,
            "annotation_status": annotation.annotation_status,
            "created_at": annotation.created_at,
            "updated_at": annotation.updated_at,
            "fluency_score": annotation.fluency_score,
            "adequacy_score": annotation.adequacy_score,
            "overall_quality": annotation.overall_quality,
            "errors_found": annotation.errors_found,
            "suggested_correction": annotation.suggested_correction,
            "comments": annotation.comments,
            "final_form": annotation.final_form,
            "time_spent_seconds": annotation.time_spent_seconds,
            "sentence": annotation.sentence,
            "annotator": UserResponse.from_orm(annotation.annotator),
            "highlights": annotation.highlights or []
        }
        response_annotations.append(annotation_dict)
    
    return response_annotations

# Admin endpoints
@app.get("/api/admin/stats", response_model=AdminStats)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    total_users = db.query(User).count()
    total_sentences = db.query(Sentence).count()
    total_annotations = db.query(Annotation).count()
    completed_annotations = db.query(Annotation).filter(
        Annotation.annotation_status == "completed"
    ).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    
    return AdminStats(
        total_users=total_users,
        total_sentences=total_sentences,
        total_annotations=total_annotations,
        completed_annotations=completed_annotations,
        active_users=active_users
    )

@app.get("/api/admin/sentences", response_model=List[SentenceResponse])
def get_admin_sentences(
    skip: int = 0,
    limit: int = 100,
    target_language: Optional[str] = None,
    source_language: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(Sentence)
    
    if target_language:
        query = query.filter(Sentence.target_language == target_language)
    if source_language:
        query = query.filter(Sentence.source_language == source_language)
    
    sentences = query.offset(skip).limit(limit).all()
    return sentences

@app.get("/api/admin/sentences/counts")
def get_sentence_counts_by_language(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get sentence counts grouped by target language."""
    from sqlalchemy import func
    
    # Get counts by target language
    target_counts = db.query(
        Sentence.target_language,
        func.count(Sentence.id).label('count')
    ).group_by(Sentence.target_language).all()
    
    # Convert to dictionary
    counts = {}
    total = 0
    for language, count in target_counts:
        counts[language] = count
        total += count
    
    # Add total count
    counts['all'] = total
    
    return counts

@app.get("/api/admin/users", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    
    # Convert to proper response format to handle language serialization
    response_users = []
    for user in users:
        response_users.append(UserResponse.from_orm(user))
    
    return response_users

@app.put("/api/admin/users/{user_id}/toggle-evaluator", response_model=UserResponse)
def toggle_user_evaluator_role(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Toggle evaluator role
    user.is_evaluator = not user.is_evaluator
    db.commit()
    db.refresh(user)
    
    # Return properly formatted response
    return UserResponse.from_orm(user)

@app.get("/api/admin/annotations", response_model=List[AnnotationResponse])
def get_all_annotations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    annotations = db.query(Annotation).offset(skip).limit(limit).all()
    
    # Convert to proper response format to handle language serialization
    response_annotations = []
    for annotation in annotations:
        # Create annotation dict
        annotation_dict = {
            "id": annotation.id,
            "sentence_id": annotation.sentence_id,
            "annotator_id": annotation.annotator_id,
            "annotation_status": annotation.annotation_status,
            "created_at": annotation.created_at,
            "updated_at": annotation.updated_at,
            "fluency_score": annotation.fluency_score,
            "adequacy_score": annotation.adequacy_score,
            "overall_quality": annotation.overall_quality,
            "errors_found": annotation.errors_found,
            "suggested_correction": annotation.suggested_correction,
            "comments": annotation.comments,
            "final_form": annotation.final_form,
            "time_spent_seconds": annotation.time_spent_seconds,
            "sentence": annotation.sentence,
            "annotator": UserResponse.from_orm(annotation.annotator),
            "highlights": annotation.highlights or []
        }
        response_annotations.append(annotation_dict)
    
    return response_annotations

@app.get("/api/admin/sentences/{sentence_id}/annotations", response_model=List[AnnotationResponse])
def get_sentence_annotations(
    sentence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    annotations = db.query(Annotation).filter(
        Annotation.sentence_id == sentence_id
    ).all()
    
    # Convert to proper response format to handle language serialization
    response_annotations = []
    for annotation in annotations:
        # Create annotation dict
        annotation_dict = {
            "id": annotation.id,
            "sentence_id": annotation.sentence_id,
            "annotator_id": annotation.annotator_id,
            "annotation_status": annotation.annotation_status,
            "created_at": annotation.created_at,
            "updated_at": annotation.updated_at,
            "fluency_score": annotation.fluency_score,
            "adequacy_score": annotation.adequacy_score,
            "overall_quality": annotation.overall_quality,
            "errors_found": annotation.errors_found,
            "suggested_correction": annotation.suggested_correction,
            "comments": annotation.comments,
            "final_form": annotation.final_form,
            "time_spent_seconds": annotation.time_spent_seconds,
            "sentence": annotation.sentence,
            "annotator": UserResponse.from_orm(annotation.annotator),
            "highlights": annotation.highlights or []
        }
        response_annotations.append(annotation_dict)
    
    return response_annotations

@app.post("/api/admin/sentences/bulk", response_model=List[SentenceResponse])
def bulk_create_sentences(
    sentences_data: List[SentenceCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_sentences = []
    for sentence_data in sentences_data:
        db_sentence = Sentence(**sentence_data.model_dump())
        db.add(db_sentence)
        db_sentences.append(db_sentence)
    
    db.commit()
    return db_sentences

# Evaluation endpoints
@app.post("/api/evaluations", response_model=EvaluationResponse)
def create_evaluation(
    evaluation_data: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_evaluator_user)
):
    # Check if evaluator already evaluated this annotation
    existing_evaluation = db.query(Evaluation).filter(
        Evaluation.annotation_id == evaluation_data.annotation_id,
        Evaluation.evaluator_id == current_user.id
    ).first()
    
    if existing_evaluation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already evaluated this annotation"
        )
    
    # Create the evaluation
    evaluation_dict = evaluation_data.model_dump()
    db_evaluation = Evaluation(
        **evaluation_dict,
        evaluator_id=current_user.id,
        evaluation_status="completed"
    )
    
    db.add(db_evaluation)
    db.commit()
    db.refresh(db_evaluation)
    
    # Update annotation status to reviewed
    annotation = db.query(Annotation).filter(Annotation.id == evaluation_data.annotation_id).first()
    if annotation:
        annotation.annotation_status = "reviewed"
        db.commit()
    
    # Return properly formatted response
    return {
        "id": db_evaluation.id,
        "annotation_id": db_evaluation.annotation_id,
        "evaluator_id": db_evaluation.evaluator_id,
        "annotation_quality_score": db_evaluation.annotation_quality_score,
        "accuracy_score": db_evaluation.accuracy_score,
        "completeness_score": db_evaluation.completeness_score,
        "overall_evaluation_score": db_evaluation.overall_evaluation_score,
        "feedback": db_evaluation.feedback,
        "evaluation_notes": db_evaluation.evaluation_notes,
        "time_spent_seconds": db_evaluation.time_spent_seconds,
        "evaluation_status": db_evaluation.evaluation_status,
        "created_at": db_evaluation.created_at,
        "updated_at": db_evaluation.updated_at,
        "evaluator": UserResponse.from_orm(db_evaluation.evaluator),
        "annotation": {
            "id": db_evaluation.annotation.id,
            "sentence_id": db_evaluation.annotation.sentence_id,
            "annotator_id": db_evaluation.annotation.annotator_id,
            "annotation_status": db_evaluation.annotation.annotation_status,
            "created_at": db_evaluation.annotation.created_at,
            "updated_at": db_evaluation.annotation.updated_at,
            "fluency_score": db_evaluation.annotation.fluency_score,
            "adequacy_score": db_evaluation.annotation.adequacy_score,
            "overall_quality": db_evaluation.annotation.overall_quality,
            "errors_found": db_evaluation.annotation.errors_found,
            "suggested_correction": db_evaluation.annotation.suggested_correction,
            "comments": db_evaluation.annotation.comments,
            "final_form": db_evaluation.annotation.final_form,
            "time_spent_seconds": db_evaluation.annotation.time_spent_seconds,
            "sentence": db_evaluation.annotation.sentence,
            "annotator": UserResponse.from_orm(db_evaluation.annotation.annotator),
            "highlights": db_evaluation.annotation.highlights or []
        }
    }

@app.put("/api/evaluations/{evaluation_id}", response_model=EvaluationResponse)
def update_evaluation(
    evaluation_id: int,
    evaluation_data: EvaluationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_evaluator_user)
):
    evaluation = db.query(Evaluation).filter(
        Evaluation.id == evaluation_id,
        Evaluation.evaluator_id == current_user.id
    ).first()
    
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    # Update evaluation fields
    update_data = evaluation_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(evaluation, field, value)
    
    db.commit()
    db.refresh(evaluation)
    
    # Return properly formatted response
    return {
        "id": evaluation.id,
        "annotation_id": evaluation.annotation_id,
        "evaluator_id": evaluation.evaluator_id,
        "annotation_quality_score": evaluation.annotation_quality_score,
        "accuracy_score": evaluation.accuracy_score,
        "completeness_score": evaluation.completeness_score,
        "overall_evaluation_score": evaluation.overall_evaluation_score,
        "feedback": evaluation.feedback,
        "evaluation_notes": evaluation.evaluation_notes,
        "time_spent_seconds": evaluation.time_spent_seconds,
        "evaluation_status": evaluation.evaluation_status,
        "created_at": evaluation.created_at,
        "updated_at": evaluation.updated_at,
        "evaluator": UserResponse.from_orm(evaluation.evaluator),
        "annotation": {
            "id": evaluation.annotation.id,
            "sentence_id": evaluation.annotation.sentence_id,
            "annotator_id": evaluation.annotation.annotator_id,
            "annotation_status": evaluation.annotation.annotation_status,
            "created_at": evaluation.annotation.created_at,
            "updated_at": evaluation.annotation.updated_at,
            "fluency_score": evaluation.annotation.fluency_score,
            "adequacy_score": evaluation.annotation.adequacy_score,
            "overall_quality": evaluation.annotation.overall_quality,
            "errors_found": evaluation.annotation.errors_found,
            "suggested_correction": evaluation.annotation.suggested_correction,
            "comments": evaluation.annotation.comments,
            "final_form": evaluation.annotation.final_form,
            "time_spent_seconds": evaluation.annotation.time_spent_seconds,
            "sentence": evaluation.annotation.sentence,
            "annotator": UserResponse.from_orm(evaluation.annotation.annotator),
            "highlights": evaluation.annotation.highlights or []
        }
    }

@app.get("/api/evaluations", response_model=List[EvaluationResponse])
def get_my_evaluations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_evaluator_user)
):
    evaluations = db.query(Evaluation).filter(
        Evaluation.evaluator_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    # Convert to proper response format to handle language serialization
    response_evaluations = []
    for evaluation in evaluations:
        # Create evaluation dict with properly converted nested objects
        evaluation_dict = {
            "id": evaluation.id,
            "annotation_id": evaluation.annotation_id,
            "evaluator_id": evaluation.evaluator_id,
            "annotation_quality_score": evaluation.annotation_quality_score,
            "accuracy_score": evaluation.accuracy_score,
            "completeness_score": evaluation.completeness_score,
            "overall_evaluation_score": evaluation.overall_evaluation_score,
            "feedback": evaluation.feedback,
            "evaluation_notes": evaluation.evaluation_notes,
            "time_spent_seconds": evaluation.time_spent_seconds,
            "evaluation_status": evaluation.evaluation_status,
            "created_at": evaluation.created_at,
            "updated_at": evaluation.updated_at,
            "evaluator": UserResponse.from_orm(evaluation.evaluator),
            "annotation": {
                "id": evaluation.annotation.id,
                "sentence_id": evaluation.annotation.sentence_id,
                "annotator_id": evaluation.annotation.annotator_id,
                "annotation_status": evaluation.annotation.annotation_status,
                "created_at": evaluation.annotation.created_at,
                "updated_at": evaluation.annotation.updated_at,
                "fluency_score": evaluation.annotation.fluency_score,
                "adequacy_score": evaluation.annotation.adequacy_score,
                "overall_quality": evaluation.annotation.overall_quality,
                "errors_found": evaluation.annotation.errors_found,
                "suggested_correction": evaluation.annotation.suggested_correction,
                "comments": evaluation.annotation.comments,
                "final_form": evaluation.annotation.final_form,
                "time_spent_seconds": evaluation.annotation.time_spent_seconds,
                "sentence": evaluation.annotation.sentence,
                "annotator": UserResponse.from_orm(evaluation.annotation.annotator),
                "highlights": evaluation.annotation.highlights or []
            }
        }
        response_evaluations.append(evaluation_dict)
    
    return response_evaluations

@app.get("/api/evaluations/pending", response_model=List[AnnotationResponse])
def get_pending_evaluations(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_evaluator_user)
):
    # Get completed annotations that haven't been evaluated by current user yet
    evaluated_annotation_ids = db.query(Evaluation.annotation_id).filter(
        Evaluation.evaluator_id == current_user.id
    ).subquery()
    
    annotations = db.query(Annotation).filter(
        Annotation.annotation_status == "completed",
        ~Annotation.id.in_(evaluated_annotation_ids)
    ).offset(skip).limit(limit).all()
    
    # Convert to proper response format to handle language serialization
    response_annotations = []
    for annotation in annotations:
        # Create annotation dict
        annotation_dict = {
            "id": annotation.id,
            "sentence_id": annotation.sentence_id,
            "annotator_id": annotation.annotator_id,
            "annotation_status": annotation.annotation_status,
            "created_at": annotation.created_at,
            "updated_at": annotation.updated_at,
            "fluency_score": annotation.fluency_score,
            "adequacy_score": annotation.adequacy_score,
            "overall_quality": annotation.overall_quality,
            "errors_found": annotation.errors_found,
            "suggested_correction": annotation.suggested_correction,
            "comments": annotation.comments,
            "final_form": annotation.final_form,
            "time_spent_seconds": annotation.time_spent_seconds,
            "sentence": annotation.sentence,
            "annotator": UserResponse.from_orm(annotation.annotator),
            "highlights": annotation.highlights or []
        }
        response_annotations.append(annotation_dict)
    
    return response_annotations

@app.get("/api/evaluator/stats", response_model=EvaluatorStats)
def get_evaluator_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_evaluator_user)
):
    total_evaluations = db.query(Evaluation).filter(
        Evaluation.evaluator_id == current_user.id
    ).count()
    
    completed_evaluations = db.query(Evaluation).filter(
        Evaluation.evaluator_id == current_user.id,
        Evaluation.evaluation_status == "completed"
    ).count()
    
    pending_evaluations = db.query(Annotation).filter(
        Annotation.annotation_status == "completed",
        ~Annotation.id.in_(
            db.query(Evaluation.annotation_id).filter(
                Evaluation.evaluator_id == current_user.id
            )
        )
    ).count()
    
    # Calculate average time per evaluation
    evaluations_with_time = db.query(Evaluation).filter(
        Evaluation.evaluator_id == current_user.id,
        Evaluation.time_spent_seconds.isnot(None)
    ).all()
    
    average_time = 0.0
    if evaluations_with_time:
        total_time = sum(e.time_spent_seconds for e in evaluations_with_time)
        average_time = total_time / len(evaluations_with_time)
    
    return EvaluatorStats(
        total_evaluations=total_evaluations,
        completed_evaluations=completed_evaluations,
        pending_evaluations=pending_evaluations,
        average_time_per_evaluation=average_time
    )

# Admin evaluation endpoints
@app.get("/api/admin/evaluations", response_model=List[EvaluationResponse])
def get_all_evaluations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    evaluations = db.query(Evaluation).offset(skip).limit(limit).all()
    
    # Convert to proper response format to handle language serialization
    response_evaluations = []
    for evaluation in evaluations:
        # Create evaluation dict with properly converted nested objects
        evaluation_dict = {
            "id": evaluation.id,
            "annotation_id": evaluation.annotation_id,
            "evaluator_id": evaluation.evaluator_id,
            "annotation_quality_score": evaluation.annotation_quality_score,
            "accuracy_score": evaluation.accuracy_score,
            "completeness_score": evaluation.completeness_score,
            "overall_evaluation_score": evaluation.overall_evaluation_score,
            "feedback": evaluation.feedback,
            "evaluation_notes": evaluation.evaluation_notes,
            "time_spent_seconds": evaluation.time_spent_seconds,
            "evaluation_status": evaluation.evaluation_status,
            "created_at": evaluation.created_at,
            "updated_at": evaluation.updated_at,
            "evaluator": UserResponse.from_orm(evaluation.evaluator),
            "annotation": {
                "id": evaluation.annotation.id,
                "sentence_id": evaluation.annotation.sentence_id,
                "annotator_id": evaluation.annotation.annotator_id,
                "annotation_status": evaluation.annotation.annotation_status,
                "created_at": evaluation.annotation.created_at,
                "updated_at": evaluation.annotation.updated_at,
                "fluency_score": evaluation.annotation.fluency_score,
                "adequacy_score": evaluation.annotation.adequacy_score,
                "overall_quality": evaluation.annotation.overall_quality,
                "errors_found": evaluation.annotation.errors_found,
                "suggested_correction": evaluation.annotation.suggested_correction,
                "comments": evaluation.annotation.comments,
                "final_form": evaluation.annotation.final_form,
                "time_spent_seconds": evaluation.annotation.time_spent_seconds,
                "sentence": evaluation.annotation.sentence,
                "annotator": UserResponse.from_orm(evaluation.annotation.annotator),
                "highlights": evaluation.annotation.highlights or []
            }
        }
        response_evaluations.append(evaluation_dict)
    
    return response_evaluations

@app.get("/api/annotations/{annotation_id}/evaluations", response_model=List[EvaluationResponse])
def get_annotation_evaluations(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_evaluator_user)
):
    evaluations = db.query(Evaluation).filter(
        Evaluation.annotation_id == annotation_id
    ).all()
    
    # Convert to proper response format to handle language serialization
    response_evaluations = []
    for evaluation in evaluations:
        # Create evaluation dict with properly converted nested objects
        evaluation_dict = {
            "id": evaluation.id,
            "annotation_id": evaluation.annotation_id,
            "evaluator_id": evaluation.evaluator_id,
            "annotation_quality_score": evaluation.annotation_quality_score,
            "accuracy_score": evaluation.accuracy_score,
            "completeness_score": evaluation.completeness_score,
            "overall_evaluation_score": evaluation.overall_evaluation_score,
            "feedback": evaluation.feedback,
            "evaluation_notes": evaluation.evaluation_notes,
            "time_spent_seconds": evaluation.time_spent_seconds,
            "evaluation_status": evaluation.evaluation_status,
            "created_at": evaluation.created_at,
            "updated_at": evaluation.updated_at,
            "evaluator": UserResponse.from_orm(evaluation.evaluator),
            "annotation": {
                "id": evaluation.annotation.id,
                "sentence_id": evaluation.annotation.sentence_id,
                "annotator_id": evaluation.annotation.annotator_id,
                "annotation_status": evaluation.annotation.annotation_status,
                "created_at": evaluation.annotation.created_at,
                "updated_at": evaluation.annotation.updated_at,
                "fluency_score": evaluation.annotation.fluency_score,
                "adequacy_score": evaluation.annotation.adequacy_score,
                "overall_quality": evaluation.annotation.overall_quality,
                "errors_found": evaluation.annotation.errors_found,
                "suggested_correction": evaluation.annotation.suggested_correction,
                "comments": evaluation.annotation.comments,
                "final_form": evaluation.annotation.final_form,
                "time_spent_seconds": evaluation.annotation.time_spent_seconds,
                "sentence": evaluation.annotation.sentence,
                "annotator": UserResponse.from_orm(evaluation.annotation.annotator),
                "highlights": evaluation.annotation.highlights or []
            }
        }
        response_evaluations.append(evaluation_dict)
    
    return response_evaluations

@app.get("/api/me/languages", response_model=List[str])
def get_user_languages_endpoint(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current user's languages"""
    return get_user_languages(db, current_user.id)

@app.post("/api/me/languages", response_model=List[str])
def update_user_languages(languages: List[str], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update the current user's languages"""
    # Delete existing languages
    db.query(UserLanguage).filter(UserLanguage.user_id == current_user.id).delete()
    
    # Add new languages
    for language in languages:
        user_language = UserLanguage(user_id=current_user.id, language=language)
        db.add(user_language)
    
    # Update preferred_language for backward compatibility
    if languages:
        current_user.preferred_language = languages[0]
        db.add(current_user)
    
    db.commit()
    
    return languages

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
