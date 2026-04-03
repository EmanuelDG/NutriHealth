from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime, timedelta

from database.database import get_db
from database.models import User, WaterTracking
from middleware.auth_middleware import get_current_active_user
from schemas.water import WaterTrackingCreate, WaterTrackingUpdate, WaterTracking as WaterTrackingSchema

router = APIRouter(prefix="/water", tags=["water"])

# Log water intake endpoint
@router.post("/log", response_model=WaterTrackingSchema)
async def log_water_intake(
    water_data: WaterTrackingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if entry exists for this date
    existing_entry = db.query(WaterTracking).filter(
        WaterTracking.user_id == current_user.id,
        WaterTracking.date == water_data.date
    ).first()
    
    if existing_entry:
        # Update  entry
        existing_entry.glasses = water_data.glasses
        db.commit()
        db.refresh(existing_entry)
        return existing_entry
    else:
        # Create new entry
        water_tracking = WaterTracking(
            user_id=current_user.id,
            date=water_data.date,
            glasses=water_data.glasses
        )
        db.add(water_tracking)
        db.commit()
        db.refresh(water_tracking)
        return water_tracking

# Get water history endpoint
@router.get("/history", response_model=List[WaterTrackingSchema])
async def get_water_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get water intake history
    water_history = db.query(WaterTracking).filter(
        WaterTracking.user_id == current_user.id
    ).order_by(WaterTracking.date.desc()).limit(limit).all()
    
    return water_history

# Get today's water intake endpoint
@router.get("/today", response_model=WaterTrackingSchema)
async def get_today_water_intake(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    today = date.today()
    

    db.expire_all()
    
    water_tracking = db.query(WaterTracking).filter(
        WaterTracking.user_id == current_user.id,
        WaterTracking.date == today
    ).first()
    
    if not water_tracking:
        # Create new entry for today
        water_tracking = WaterTracking(
            user_id=current_user.id,
            date=today,
            glasses=0
        )
        db.add(water_tracking)
        db.commit()
        db.refresh(water_tracking)
    else:
        # Refresh latest data
        db.refresh(water_tracking)
        
    return water_tracking 