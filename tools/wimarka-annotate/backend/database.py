from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./annotation_system.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    preferred_language = Column(String)  # Language user is proficient in
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    guidelines_seen = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    annotations = relationship("Annotation", back_populates="annotator")

class Sentence(Base):
    __tablename__ = "sentences"
    
    id = Column(Integer, primary_key=True, index=True)
    source_text = Column(Text)
    machine_translation = Column(Text)
    reference_translation = Column(Text, nullable=True)
    source_language = Column(String)
    target_language = Column(String)
    domain = Column(String, nullable=True)  # e.g., medical, legal, technical
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    annotations = relationship("Annotation", back_populates="sentence")

class TextHighlight(Base):
    __tablename__ = "text_highlights"
    
    id = Column(Integer, primary_key=True, index=True)
    annotation_id = Column(Integer, ForeignKey("annotations.id"), index=True)
    
    # Text segment information
    highlighted_text = Column(Text)  # The actual highlighted text
    start_index = Column(Integer)  # Start character position in the text
    end_index = Column(Integer)  # End character position in the text
    text_type = Column(String)  # 'machine' or 'reference' - which text this highlight belongs to
    
    # Annotation details
    highlight_type = Column(String)  # 'error', 'suggestion', 'note'
    comment = Column(Text)  # User's comment about this highlight
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    annotation = relationship("Annotation", back_populates="highlights")

class Annotation(Base):
    __tablename__ = "annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    sentence_id = Column(Integer, ForeignKey("sentences.id"))
    annotator_id = Column(Integer, ForeignKey("users.id"))
    
    # Quality ratings (1-5 scale)
    fluency_score = Column(Integer)  # How fluent is the translation
    adequacy_score = Column(Integer)  # How adequate is the translation
    overall_quality = Column(Integer)  # Overall quality assessment
    
    # Legacy text fields (for backward compatibility)
    errors_found = Column(Text)  # Legacy field - JSON string of error categories and descriptions
    suggested_correction = Column(Text)  # Legacy field - Suggested improved translation
    comments = Column(Text)  # General comments (in addition to highlight-specific comments)
    
    # Metadata
    time_spent_seconds = Column(Integer)  # Time spent on annotation
    annotation_status = Column(String, default="in_progress")  # in_progress, completed, reviewed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sentence = relationship("Sentence", back_populates="annotations")
    annotator = relationship("User", back_populates="annotations")
    highlights = relationship("TextHighlight", back_populates="annotation", cascade="all, delete-orphan")

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 