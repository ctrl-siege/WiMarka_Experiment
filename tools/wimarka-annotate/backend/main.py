from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List, Optional
import json

from database import get_db, create_tables, User, Sentence, Annotation, TextHighlight
from auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash, 
    get_current_user, 
    get_current_admin_user,
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
    AdminStats,
    UserStats
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
        preferred_language=user_data.preferred_language,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
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
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/api/me/guidelines-seen", response_model=UserResponse)
def mark_guidelines_seen(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.guidelines_seen = True
    db.commit()
    db.refresh(current_user)
    return current_user

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
    annotation_dict = annotation_data.dict(exclude={'highlights'})
    db_annotation = Annotation(
        **annotation_dict,
        annotator_id=current_user.id,
        annotation_status="completed"
    )
    
    db.add(db_annotation)
    db.flush()  # Flush to get the annotation ID
    
    # Create associated highlights
    if annotation_data.highlights:
        for highlight_data in annotation_data.highlights:
            db_highlight = TextHighlight(
                annotation_id=db_annotation.id,
                highlighted_text=highlight_data.highlighted_text,
                start_index=highlight_data.start_index,
                end_index=highlight_data.end_index,
                text_type=highlight_data.text_type,
                highlight_type=highlight_data.highlight_type,
                comment=highlight_data.comment
            )
            db.add(db_highlight)
    
    db.commit()
    db.refresh(db_annotation)
    return db_annotation

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
        **annotation_data.dict(),
        annotator_id=current_user.id,
        annotation_status="completed"
    )
    
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    return db_annotation

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
    update_data = annotation_data.dict(exclude_unset=True, exclude={'highlights'})
    for field, value in update_data.items():
        setattr(annotation, field, value)
    
    # Update highlights if provided
    if annotation_data.highlights is not None:
        # Delete existing highlights
        db.query(TextHighlight).filter(TextHighlight.annotation_id == annotation_id).delete()
        
        # Create new highlights
        for highlight_data in annotation_data.highlights:
            db_highlight = TextHighlight(
                annotation_id=annotation_id,
                highlighted_text=highlight_data.highlighted_text,
                start_index=highlight_data.start_index,
                end_index=highlight_data.end_index,
                text_type=highlight_data.text_type,
                highlight_type=highlight_data.highlight_type,
                comment=highlight_data.comment
            )
            db.add(db_highlight)
    
    db.commit()
    db.refresh(annotation)
    return annotation

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
    return annotations

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

@app.get("/api/admin/users", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@app.get("/api/admin/annotations", response_model=List[AnnotationResponse])
def get_all_annotations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    annotations = db.query(Annotation).offset(skip).limit(limit).all()
    return annotations

@app.post("/api/admin/sentences/bulk", response_model=List[SentenceResponse])
def bulk_create_sentences(
    sentences_data: List[SentenceCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_sentences = []
    for sentence_data in sentences_data:
        db_sentence = Sentence(**sentence_data.dict())
        db.add(db_sentence)
        db_sentences.append(db_sentence)
    
    db.commit()
    return db_sentences

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
