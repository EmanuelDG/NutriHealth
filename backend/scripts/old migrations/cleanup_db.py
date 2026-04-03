from database.database import get_db, SessionLocal
from database.models import Recommendation

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def cleanup_recommendations():
    db = SessionLocal()
    try:
        count = db.query(Recommendation).delete()
        db.commit()
        print(f"Deleted {count} recommendations from the database")
    except Exception as e:
        db.rollback()
        print(f"Error cleaning up recommendations: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_recommendations() 