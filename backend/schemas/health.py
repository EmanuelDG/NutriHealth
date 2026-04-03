from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date
from enum import Enum

# Health condition enum
class HealthCondition(str, Enum):
    DIABETES = "diabetes"
    HYPERTENSION = "hypertension"
    HEART_DISEASE = "heart_disease"
    OBESITY = "obesity"
    ALLERGIES = "allergies"
    CELIAC = "celiac"
    LACTOSE_INTOLERANCE = "lactose_intolerance"
    IBS = "ibs"
    NONE = "none"

# Activity level enum
class ActivityLevel(str, Enum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    ACTIVE = "active"
    VERY_ACTIVE = "very_active"

# Gender enum
class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"

# Health classification create schema
class HealthClassificationCreate(BaseModel):
    age: int = Field(..., ge=0, le=120)
    gender: Gender
    weight: float = Field(..., ge=0, lt=500)
    height: float = Field(..., ge=0, lt=300)
    daily_activity: ActivityLevel
    health_conditions: List[HealthCondition] = []
    
    @validator('health_conditions', pre=True)
    def validate_health_conditions(cls, v):
        if not v:
            return [HealthCondition.NONE]
        return v

# Health classification base schema
class HealthClassificationBase(BaseModel):
    bmi: float
    classification: str
    recommendations: List[str] = []
    created_at: date

    class Config:
        orm_mode = True

# Health classification response schema
class HealthClassificationResponse(HealthClassificationBase):
    id: int
    user_id: int

# User health statistics schema
class UserHealthStatistics(BaseModel):
    overall_status: str
    bmi_trend: List[float] = []
    historical_classifications: List[str] = []
    classification_dates: List[date] = []
    recommendations: List[str] = []

# Health recommendation schema
class HealthRecommendation(BaseModel):
    recommendation_type: str
    description: str
    priority: int = 1 