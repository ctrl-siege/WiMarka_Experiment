#!/usr/bin/env python3
"""
Migration script to remove tagalog_source_text and reference_translation fields
from the sentences table and update any reference highlights to machine type.
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    # Path to the database
    db_path = Path(__file__).parent / "annotation_system.db"
    
    if not db_path.exists():
        print(f"Database file {db_path} does not exist. No migration needed.")
        return
    
    # Create backup
    backup_path = Path(__file__).parent / f"annotation_system_backup_{int(__import__('time').time())}.db"
    print(f"Creating backup at {backup_path}")
    
    import shutil
    shutil.copy2(db_path, backup_path)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns exist before trying to remove them
        cursor.execute("PRAGMA table_info(sentences)")
        columns = [column[1] for column in cursor.fetchall()]
        
        has_tagalog = 'tagalog_source_text' in columns
        has_reference = 'reference_translation' in columns
        
        if has_tagalog or has_reference:
            print("Found columns to remove. Starting migration...")
            
            # Create new table without the unwanted columns
            cursor.execute("""
                CREATE TABLE sentences_new (
                    id INTEGER PRIMARY KEY,
                    source_text TEXT,
                    machine_translation TEXT,
                    source_language TEXT,
                    target_language TEXT,
                    domain TEXT,
                    created_at TEXT,
                    is_active BOOLEAN DEFAULT 1
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO sentences_new (
                    id, source_text, machine_translation, source_language, 
                    target_language, domain, created_at, is_active
                )
                SELECT 
                    id, source_text, machine_translation, source_language, 
                    target_language, domain, created_at, is_active
                FROM sentences
            """)
            
            # Drop old table and rename new table
            cursor.execute("DROP TABLE sentences")
            cursor.execute("ALTER TABLE sentences_new RENAME TO sentences")
            
            print("Successfully removed tagalog_source_text and reference_translation columns.")
        else:
            print("Columns already removed or don't exist.")
        
        # Update any 'reference' text_type to 'machine' in text_highlights
        cursor.execute("SELECT COUNT(*) FROM text_highlights WHERE text_type = 'reference'")
        ref_count = cursor.fetchone()[0]
        
        if ref_count > 0:
            print(f"Found {ref_count} reference highlights. Converting to machine type...")
            cursor.execute("UPDATE text_highlights SET text_type = 'machine' WHERE text_type = 'reference'")
            print(f"Converted {ref_count} reference highlights to machine type.")
        else:
            print("No reference highlights found to convert.")
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
