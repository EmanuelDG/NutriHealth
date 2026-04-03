from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime, date

# response schema
class UserProfileResponse(BaseModel):
    id: int
    name: str
    username: str
    email: str
    phone_number: Optional[str] = None
    gender: Optional[int] = None
    date_of_birth: Optional[datetime] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    daily_physical_activity: Optional[int] = None
    daily_physical_activity_goal: Optional[int] = None
    heart_disease: Optional[bool] = None
    diabetes: Optional[bool] = None
    family_heart_disease: Optional[bool] = None
    family_diabetes: Optional[bool] = None
    smoking_status: Optional[bool] = None
    alcohol_consumption: Optional[bool] = None
    dietary_restriction: Optional[str] = None
    food_allergies: Optional[str] = None

# update schema
class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    phone_number: Optional[str] = None
    gender: Optional[int] = None
    date_of_birth: Optional[date] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    daily_physical_activity: Optional[int] = None
    daily_physical_activity_goal: Optional[int] = None
    heart_disease: Optional[bool] = None
    diabetes: Optional[bool] = None
    family_heart_disease: Optional[bool] = None
    family_diabetes: Optional[bool] = None
    smoking_status: Optional[bool] = None
    alcohol_consumption: Optional[bool] = None
    dietary_restriction: Optional[str] = None
    food_allergies: Optional[str] = None