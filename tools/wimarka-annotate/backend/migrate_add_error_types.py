#!/usr/bin/env python3
"""
Migration script to add error_type field to text_highlights table
"""

import sqlite3
from datetime import datetime

def migrate_database():
    """Add error_type column to text_highlights table"""
    
    # Connect to the database
    conn = sqlite3.connect('./annotation_system.db')
    cursor = conn.cursor()
    
    try:
        # Check if error_type column already exists
        cursor.execute("PRAGMA table_info(text_highlights)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'error_type' not in columns:
            print("Adding error_type column to text_highlights table...")
            
            # Add the error_type column
            cursor.execute("""
                ALTER TABLE text_highlights 
                ADD COLUMN error_type TEXT DEFAULT 'MI_SE'
            """)
            
            print("Successfully added error_type column")
        else:
            print("error_type column already exists")
        
        # Commit the changes
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting migration to add error_type field...")
    migrate_database()
    print("Migration completed!")
