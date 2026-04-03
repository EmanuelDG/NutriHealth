import os
import sys
import traceback
import psycopg2
from psycopg2 import sql

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'diet_app')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASS = os.environ.get('DB_PASS', '123')

def run_migration():
    print(f"Running migration on database: {DB_NAME} at {DB_HOST}:{DB_PORT}")
    
    alter_statements = [
        "ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS nutrient_adequacy_score FLOAT",
        "ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS meal_balance_score FLOAT",
        "ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS health_impact_score FLOAT",
        "ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS personalization_score FLOAT",
        "ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS score_explanation TEXT"
    ]
    
    try:
        print(f"Attempting to connect to PostgreSQL database...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        
        print("Connection successful!")
        cur = conn.cursor()
            
        for statement in alter_statements:
            print(f"Executing: {statement}")
            cur.execute(statement)
        
        conn.commit()
        print("Changes committed successfully!")
        
        cur.close()
        conn.close()
        
        print("Migration completed successfully!")
        return True
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {str(e)}")
        print("Please check PostgreSQL server is running and connection details.")
        print(f"Connection details: host={DB_HOST}, port={DB_PORT}, dbname={DB_NAME}, user={DB_USER}")
        return False
    except Exception as e:
        print(f"Error running migration: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Startting migration script...")
    success = run_migration()
    sys.exit(0 if success else 1) 