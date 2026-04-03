from database.database import get_db
from database.models import User, ExerciseLog
from datetime import datetime

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def main():
    # Get database session
    db = next(get_db())
    
    # Print user information
    print("=== Users ===")
    for user in db.query(User).all():
        print(f"User ID: {user.id}, Name: {user.name}, Activity: {user.daily_physical_activity}")
    
    # Print exercise logs
    print("\n=== Exercise Logs ===")
    for log in db.query(ExerciseLog).all():
        print(f"Log ID: {log.id}, User ID: {log.user_id}, Duration: {log.duration}, Timestamp: {log.timestamp}")
    
    # Print today's exercise logs
    today_start = datetime.combine(datetime.now().date(), datetime.min.time())
    today_end = datetime.combine(datetime.now().date(), datetime.max.time())
    print("\n=== Today's Exercise Logs ===")
    for log in db.query(ExerciseLog).filter(
        ExerciseLog.timestamp >= today_start,
        ExerciseLog.timestamp <= today_end
    ).all():
        print(f"Log ID: {log.id}, User ID: {log.user_id}, Duration: {log.duration}, Timestamp: {log.timestamp}")

if __name__ == "__main__":
    main() 