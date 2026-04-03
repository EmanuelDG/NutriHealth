from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Meal log entry schema
class MealLogEntry(BaseModel):
    meal_name: str
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbohydrates: Optional[float] = None
    fats: Optional[float] = None
    sugar: Optional[float] = None
    fiber: Optional[float] = None

# Meal log response schema
class MealLogResponse(BaseModel):
    id: int
    meal_name: str
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbohydrates: Optional[float] = None
    fats: Optional[float] = None
    sugar: Optional[float] = None
    fiber: Optional[float] = None
    timestamp: datetime

# Food search result schema
class FoodSearchResult(BaseModel):
    name: str 
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fats: Optional[float] = None
    sugar: Optional[float] = None
    fiber: Optional[float] = None
    imageUrl: Optional[str] = None
    
    class Config:
        allow_population_by_field_name = True
        fields = {
            'name': 'product_name',
            'imageUrl': 'image_url'
        }

# Food search response schema
class FoodSearchResponse(BaseModel):
    results: List[FoodSearchResult]
    count: int 