#!/usr/bin/env python3
"""
Migration script to add is_evaluator column to existing users table.
Run this script once to migrate the database after updating the User model.
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
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_evaluator' in columns:
            print("Column 'is_evaluator' already exists. No migration needed.")
            return
        
        # Add the is_evaluator column
        cursor.execute("ALTER TABLE users ADD COLUMN is_evaluator BOOLEAN DEFAULT FALSE")
        
        # Update all existing users to have is_evaluator = False
        cursor.execute("UPDATE users SET is_evaluator = FALSE WHERE is_evaluator IS NULL")
        
        # Commit the changes
        conn.commit()
        print("Successfully added 'is_evaluator' column to users table.")
        print("All existing users have been set to is_evaluator = FALSE.")
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_database()
