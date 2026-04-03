from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.database import get_db
from database.models import User, ExerciseLog
from middleware.auth_middleware import get_current_active_user
from schemas.exercise import ExerciseLogCreate, ExerciseLogResponse

# Exercise routes
router = APIRouter(
    prefix="/exercise",
    tags=["exercise"],
    responses={404: {"description": "Not found"}},
)

# Log exercise route
@router.post("/log", response_model=ExerciseLogResponse)
async def log_exercise(
    exercise_data: ExerciseLogCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):

    # Debug info
    print(f"Exercise log request received: {exercise_data}")
    print(f"Replace daily total flag: {exercise_data.replace_daily_total}")
    print(f"User ID: {current_user.id}, Current activity value: {current_user.daily_physical_activity}")
    
    # Get the current timestamp for this log
    log_timestamp = exercise_data.timestamp or datetime.now()
    
    # Update the user's daily_physical_activity field
    if exercise_data.replace_daily_total:
        # If replace_daily_total flag is set, use this duration as the total
        print(f"Replacing daily total with: {exercise_data.duration}")
        current_user.daily_physical_activity = exercise_data.duration
    else:
        # Calculate the total exercise minutes for today from existing logs
        today_start = datetime.combine(datetime.now().date(), datetime.min.time())
        today_end = datetime.combine(datetime.now().date(), datetime.max.time())
        
        # Get the existing logs 
        today_total = db.query(func.sum(ExerciseLog.duration)).filter(
            ExerciseLog.user_id == current_user.id,
            ExerciseLog.timestamp >= today_start,
            ExerciseLog.timestamp <= today_end
        ).scalar() or 0
        
        # Add the new exercise duration
        today_total += exercise_data.duration
        print(f"Adding to daily total: {today_total} (previous: {current_user.daily_physical_activity})")
        
        # Update the user's daily_physical_activity field
        current_user.daily_physical_activity = today_total
    
    # Create new exercise log entry
    new_log = ExerciseLog(
        user_id=current_user.id,
        activity_type=exercise_data.activity_type,
        duration=exercise_data.duration,
        calories_burned=exercise_data.calories_burned,
        timestamp=log_timestamp
    )
    
    # Add to database and commit changes
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    # Check if the user's exercise was updated correctly
    db.refresh(current_user)
    print(f"User daily_physical_activity after update: {current_user.daily_physical_activity}")
    
    # Create a formatted response
    return {
        "id": new_log.id,
        "activity_type": new_log.activity_type,
        "duration": new_log.duration,
        "calories_burned": new_log.calories_burned,
        "timestamp": new_log.timestamp
    }

# Get exercise history route
@router.get("/history", response_model=List[ExerciseLogResponse])
async def get_exercise_history(
    days: int = 7,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Query the database for exercise logs
    exercise_logs = db.query(ExerciseLog).filter(
        ExerciseLog.user_id == current_user.id,
        ExerciseLog.timestamp >= start_date,
        ExerciseLog.timestamp <= end_date
    ).order_by(ExerciseLog.timestamp.desc()).all()
    
    # Format the response
    formatted_logs = []
    for log in exercise_logs:
        formatted_logs.append({
            "id": log.id,
            "activity_type": log.activity_type,
            "duration": log.duration,
            "calories_burned": log.calories_burned,
            "timestamp": log.timestamp
        })
    
    return formatted_logs

# Get daily exercise route
@router.get("/daily", response_model=dict)
async def get_daily_exercise(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Debug info
    print(f"Getting daily exercise for user ID: {current_user.id}")
    print(f"User daily_physical_activity: {current_user.daily_physical_activity}")
    
    # Get the user's daily exercise total
    today_total = current_user.daily_physical_activity or 0
    
    # Get the user's daily goal
    daily_goal = current_user.daily_physical_activity_goal or 30
    
    # Calculate percentage
    percent = min(round((today_total / daily_goal) * 100) if daily_goal > 0 else 0, 100)
    
    print(f"Returning daily exercise: total={today_total}, goal={daily_goal}, percent={percent}")
    
    return {
        "total_minutes": today_total,
        "goal_minutes": daily_goal,
        "percent": percent
    }

# Delete exercise log route
@router.delete("/{exercise_id}", response_model=dict)
async def delete_exercise_log(
    exercise_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Debug info
    print(f"Delete exercise log request received for ID: {exercise_id}, User ID: {current_user.id}")
    
    # Find the exercise log
    exercise_log = db.query(ExerciseLog).filter(
        ExerciseLog.id == exercise_id,
        ExerciseLog.user_id == current_user.id
    ).first()
    
    # If the log doesn't exist or doesn't belong to the current user
    if not exercise_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercise log with ID {exercise_id} not found or does not belong to the current user"
        )
    
    # Get the exercise duration before deleting
    deleted_duration = exercise_log.duration
    
    # Delete the log
    db.delete(exercise_log)
    
    # Check if the log was for today to update user's daily activity
    log_date = exercise_log.timestamp.date()
    today_date = datetime.now().date()
    
    if log_date == today_date:
        # If it was today's exercise, recalculate the user's daily total
        today_start = datetime.combine(today_date, datetime.min.time())
        today_end = datetime.combine(today_date, datetime.max.time())
        
        today_total = db.query(func.sum(ExerciseLog.duration)).filter(
            ExerciseLog.user_id == current_user.id,
            func.date(ExerciseLog.timestamp) == today_date
        ).scalar() or 0
        
        # Update the user's daily exercise total
        current_user.daily_physical_activity = today_total
        
        print(f"Updated daily activity after deletion: from {current_user.daily_physical_activity + deleted_duration} to {today_total}")
    
    # Commit changes
    db.commit()
    
    return {"status": "success", "message": f"Exercise log with ID {exercise_id} deleted successfully"} 