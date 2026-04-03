from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import requests

from database.database import get_db
from database.models import User, MealLog
from middleware.auth_middleware import get_current_active_user
from schemas.meal import MealLogEntry, MealLogResponse, FoodSearchResult, FoodSearchResponse

router = APIRouter(
    prefix="/meals",
    tags=["meals"],
    responses={404: {"description": "Not found"}},
)

# Search food endpoint
@router.get("/search", response_model=FoodSearchResponse)
async def search_food(
    query: str = Query(..., min_length=2, description="Food item to search"),
    current_user: User = Depends(get_current_active_user)
):

    try:
        # Call Open Food Facts API
        api_url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&json=true"
        response = requests.get(api_url, timeout=25)  
        response.raise_for_status()
        data = response.json()
        products = data.get("products", [])
        
        # Format the results
        results = []
        for product in products[:10]:  
            nutriments = product.get("nutriments", {})
            
            # Convert from kJ to kcal if needed
            energy_kcal = nutriments.get("energy-kcal_100g")
            if not energy_kcal and nutriments.get("energy_100g"):
                energy_kcal = nutriments.get("energy_100g") / 4.184  # Convert kJ to kcal
            
            results.append(FoodSearchResult(
                name=product.get("product_name", "Unknown"),
                calories=energy_kcal,
                protein=nutriments.get("proteins_100g"),
                carbs=nutriments.get("carbohydrates_100g"),
                fats=nutriments.get("fat_100g"),
                sugar=nutriments.get("sugars_100g"),
                fiber=nutriments.get("fiber_100g"),
                imageUrl=product.get("image_url")
            ))
        
        return FoodSearchResponse(
            results=results,
            count=len(results)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search food: {str(e)}"
        )

# Log meal endpoint
@router.post("/log", response_model=MealLogResponse)
async def log_meal(
    meal: MealLogEntry,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Create new meal log entry
    new_meal = MealLog(
        user_id=current_user.id,
        name=meal.meal_name,  
        description="Logged via app",
        meal_type="general",  
        calories=meal.calories,
        protein=meal.protein,
        carbs=meal.carbohydrates,  
        fat=meal.fats,  
        sugar=meal.sugar,
        fiber=meal.fiber
    )
    
    # Add to database
    db.add(new_meal)
    db.commit()
    db.refresh(new_meal)
    
    # Return the response with field names matching the response model 
    return MealLogResponse(
        id=new_meal.id,
        meal_name=new_meal.name,
        calories=new_meal.calories,
        protein=new_meal.protein,
        carbohydrates=new_meal.carbs,
        fats=new_meal.fat,
        sugar=new_meal.sugar,
        fiber=new_meal.fiber,
        timestamp=new_meal.timestamp
    )

# Get meal history endpoint
@router.get("/history", response_model=List[MealLogResponse])
async def get_meal_history(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Query for the user's meal logs
    meal_logs = db.query(MealLog).filter(
        MealLog.user_id == current_user.id
    ).order_by(
        MealLog.timestamp.desc()
    ).offset(offset).limit(limit).all()
    
    return [
        MealLogResponse(
            id=meal.id,
            meal_name=meal.name,
            calories=meal.calories,
            protein=meal.protein,
            carbohydrates=meal.carbs,
            fats=meal.fat,
            sugar=meal.sugar,
            fiber=meal.fiber,
            timestamp=meal.timestamp
        ) for meal in meal_logs
    ] 