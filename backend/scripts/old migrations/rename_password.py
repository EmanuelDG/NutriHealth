import sys
import os


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.database import engine


def rename_password_column():
    print("Renaming password column to hashed_password...")
    
    # Connect to the database
    with engine.connect() as connection:
        try:
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='password'"
            ))
            
            if result.fetchone():
                connection.execute(text(
                    "ALTER TABLE users RENAME COLUMN password TO hashed_password"
                ))
                connection.commit()
                print("Column renamed successfully!")
            else:
                print("Password column not found. It may have already been renamed.")
            
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='hashed_password'"
            ))
            
            if result.fetchone():
                print("Verified: hashed_password column exists in the users table.")
            else:
                print("ERROR: hashed_password column was not found after rename.")
                
        except Exception as e:
            print(f"Error renaming column: {e}")
            connection.rollback()
            
if __name__ == "__main__":
    rename_password_column() 