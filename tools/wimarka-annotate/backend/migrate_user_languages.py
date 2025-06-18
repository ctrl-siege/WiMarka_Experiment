from sqlalchemy import text, Column, Integer, String, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from database import engine, Base, User

def migrate_user_languages():
    """Migration to create a new user_languages table and handle the relationship with users."""
    print("Creating user_languages table...")
    
    connection = engine.connect()
    
    try:
        # Create the user_languages table
        connection.execute(text("""
        CREATE TABLE IF NOT EXISTS user_languages (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            language TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE (user_id, language)
        )
        """))
        
        # Populate the user_languages table with existing data from preferred_language column
        connection.execute(text("""
        INSERT OR IGNORE INTO user_languages (user_id, language)
        SELECT id, preferred_language FROM users
        WHERE preferred_language IS NOT NULL
        """))
        
        connection.commit()
        print("Successfully created user_languages table and migrated existing data")
        
    except Exception as e:
        print(f"User languages migration error: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    migrate_user_languages()
