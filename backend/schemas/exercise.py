from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Exercise log create schema
class ExerciseLogCreate(BaseModel):
    activity_type: Optional[str] = None
    duration: int
    calories_burned: Optional[float] = None
    timestamp: Optional[datetime] = None
    replace_daily_total: Optional[bool] = False

# Exercise log response schema
class ExerciseLogResponse(BaseModel):
    id: int
    activity_type: Optional[str]
    duration: int
    calories_burned: Optional[float]
    timestamp: datetime 