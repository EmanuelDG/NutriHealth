from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, date

from database.database import get_db
from database.models import User
from middleware.auth_middleware import get_current_active_user
from schemas.user import UserProfileResponse, UserProfileUpdate

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

# Map user to profile response
def map_user_to_profile_response(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "phone_number": user.phone_number,
        "gender": int(user.gender) if user.gender is not None else None,
        "date_of_birth": user.date_of_birth,
        "height": user.height,
        "weight": user.weight,
        "daily_physical_activity": int(user.daily_physical_activity) if user.daily_physical_activity is not None else None,
        "daily_physical_activity_goal": int(user.daily_physical_activity_goal) if user.daily_physical_activity_goal is not None else None,
        "heart_disease": user.heart_disease,
        "diabetes": user.diabetes,
        "family_heart_disease": False if not hasattr(user, 'family_heart_disease') else user.family_heart_disease,
        "family_diabetes": False if not hasattr(user, 'family_diabetes') else user.family_diabetes,
        "smoking_status": user.smoking if hasattr(user, 'smoking') else False,
        "alcohol_consumption": user.alcohol if hasattr(user, 'alcohol') else False,
        "dietary_restriction": user.restrictions if hasattr(user, 'restrictions') else None,
        "food_allergies": user.allergies if hasattr(user, 'allergies') else None
    }

# Get user profile endpoint
@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(current_user: User = Depends(get_current_active_user)):
    return map_user_to_profile_response(current_user)

# Update user profile endpoint
@router.post("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    user_data = profile_update.dict(exclude_unset=True)
    
    # Check if username is being updated and ensure it's unique
    if 'username' in user_data and user_data['username'] != current_user.username:
        existing_user = db.query(User).filter(User.username == user_data['username']).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Map fields 
    field_mapping = {
        "smoking_status": "smoking",
        "alcohol_consumption": "alcohol",
        "dietary_restriction": "restrictions",
        "food_allergies": "allergies"
    }
    
    # Update attributes 
    for key, value in user_data.items():
        db_field = field_mapping.get(key, key)
        setattr(current_user, db_field, value)
    current_user.updated_at = datetime.now()
    
    # Commit changes
    db.commit()
    db.refresh(current_user)
    
    return map_user_to_profile_response(current_user) 