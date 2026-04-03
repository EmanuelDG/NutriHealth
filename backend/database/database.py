from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Enforce PostgreSQL connection
if not DATABASE_URL or not DATABASE_URL.startswith("postgresql://"):
    print("ERROR: PostgreSQL database connection not configured correctly.")
    print("Please set DATABASE_URL in your .env file to a valid PostgreSQL connection string.")
    print("Example: DATABASE_URL=postgresql://username:password@localhost/dbname")
    sys.exit(1)

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()

# get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 