"""
Database migration script to add TextHighlight table and update schema
"""
import sqlite3
from database import create_tables, engine
from sqlalchemy import text
from sqlalchemy import create_engine
from database import SQLALCHEMY_DATABASE_URL

def migrate_database():
    """
    Migrate the database to support the new text highlighting feature
    """
    print("Starting database migration...")
    
    # Create a connection to the database
    connection = engine.connect()
    
    try:
        # Check if text_highlights table already exists
        result = connection.execute(text("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='text_highlights'
        """))
        
        if result.fetchone():
            print("TextHighlight table already exists. Migration not needed.")
            return
        
        # Create the new table
        print("Creating text_highlights table...")
        connection.execute(text("""
            CREATE TABLE text_highlights (
                id INTEGER PRIMARY KEY,
                annotation_id INTEGER NOT NULL,
                highlighted_text TEXT NOT NULL,
                start_index INTEGER NOT NULL,
                end_index INTEGER NOT NULL,
                text_type TEXT NOT NULL,
                highlight_type TEXT NOT NULL,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (annotation_id) REFERENCES annotations (id)
            )
        """))
        
        # Create index on annotation_id for better performance
        connection.execute(text("""
            CREATE INDEX ix_text_highlights_annotation_id 
            ON text_highlights (annotation_id)
        """))
        
        connection.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

def migrate_users_table():
    """Migration to add preferred_language column to users table"""
    print("Checking users table migration...")
    
    connection = engine.connect()
    
    try:
        # Check if preferred_language column exists
        result = connection.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'preferred_language' not in columns:
            print("Adding preferred_language column to users table...")
            
            # Add the preferred_language column with a default value
            connection.execute(text("ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'tagalog'"))
            connection.commit()
            
            print("Successfully added preferred_language column")
        else:
            print("preferred_language column already exists")
            
    except Exception as e:
        print(f"Users table migration error: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    migrate_database()
    migrate_users_table()
    print("All migrations completed!") 