#!/usr/bin/env python3
"""
Migration script to add MTQualityAssessment table for DistilBERT-based MT evaluation.
Run this script once to migrate the database after updating the database models.
"""

import sqlite3
import os

def migrate_database():
    # Database file path
    db_path = "annotation_system.db"
    
    if not os.path.exists(db_path):
        print("Database file not found. No migration needed.")
        return
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the table already exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='mt_quality_assessments'")
        if cursor.fetchone():
            print("Table 'mt_quality_assessments' already exists. No migration needed.")
            return
        
        # Create the mt_quality_assessments table
        cursor.execute("""
            CREATE TABLE mt_quality_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sentence_id INTEGER NOT NULL,
                evaluator_id INTEGER NOT NULL,
                fluency_score REAL,
                adequacy_score REAL,
                overall_quality_score REAL,
                syntax_errors TEXT,
                semantic_errors TEXT,
                quality_explanation TEXT,
                correction_suggestions TEXT,
                model_confidence REAL,
                processing_time_ms INTEGER,
                time_spent_seconds INTEGER,
                human_feedback TEXT,
                correction_notes TEXT,
                evaluation_status VARCHAR DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sentence_id) REFERENCES sentences (id),
                FOREIGN KEY (evaluator_id) REFERENCES users (id)
            )
        """)
        
        # Create indices for better performance
        cursor.execute("CREATE INDEX idx_mt_quality_sentence_id ON mt_quality_assessments (sentence_id)")
        cursor.execute("CREATE INDEX idx_mt_quality_evaluator_id ON mt_quality_assessments (evaluator_id)")
        cursor.execute("CREATE INDEX idx_mt_quality_status ON mt_quality_assessments (evaluation_status)")
        
        # Create trigger to update updated_at timestamp
        cursor.execute("""
            CREATE TRIGGER update_mt_quality_updated_at 
            AFTER UPDATE ON mt_quality_assessments
            BEGIN
                UPDATE mt_quality_assessments 
                SET updated_at = CURRENT_TIMESTAMP 
                WHERE id = NEW.id;
            END
        """)
        
        # Commit the changes
        conn.commit()
        print("Successfully created 'mt_quality_assessments' table and related indices.")
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_database()
