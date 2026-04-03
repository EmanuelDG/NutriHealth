from pydantic import BaseModel
from typing import Optional
from datetime import date

# base schema
class WaterTrackingBase(BaseModel):
    date: date
    glasses: int

# create schema
class WaterTrackingCreate(WaterTrackingBase):
    pass

# update schema
class WaterTrackingUpdate(BaseModel):
    glasses: int

# response schema
class WaterTracking(WaterTrackingBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True 