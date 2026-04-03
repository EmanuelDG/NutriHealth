from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from ml import model_loader
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os

# Import database models
from database.database import get_db
from database.models import User, HealthStatus, MealLog, NutrientTarget
from middleware.auth_middleware import get_current_active_user

router = APIRouter(
    prefix="/health",
    tags=["health"],
    responses={404: {"description": "Not found"}},
)

class HealthFeatures(BaseModel):
    age: int
    gender: int  # 1 = Male, 2 = Female
    bmi: float
    daily_activity: int  # minutes
    heart_disease: bool
    diabetes: bool
    smoking: bool
    alcohol: bool
    protein_intake: float
    carbs_intake: float

# Health classification response model
class HealthClassificationResponse(BaseModel):
    classification: str
    confidence: Optional[float] = None
    timestamp: datetime
    recommendations: List[str] = []

# Health status response model
class HealthStatusResponse(BaseModel):
    id: int
    classification: str
    date: datetime

# Nutrient target model
class NutrientTargetModel(BaseModel):
    calories: float
    protein: float
    carbs: float
    fats: float
    sugar: float
    fiber: float

# Get health status endpoint
@router.get("/status", response_model=HealthStatusResponse)
async def get_health_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Query the database for the most recent health status
    health_status = db.query(HealthStatus).filter(
        HealthStatus.user_id == current_user.id
    ).order_by(
        HealthStatus.date.desc()
    ).first()
    
    if not health_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No health status found. Please classify your health first."
        )
    
    # Return a dict that matches the response model
    return HealthStatusResponse(
        id=health_status.id,
        classification=health_status.classification,
        date=health_status.date
    )

# Classify health endpoint
@router.post("/classify", response_model=HealthClassificationResponse)
async def classify_health(
    features: HealthFeatures,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # Calculate protein and carb intake from recent meal logs
        # Get last 3 days of meal logs for average nutrient intake
        three_days_ago = datetime.now() - timedelta(days=3)
        
        recent_meals = db.query(MealLog).filter(
            MealLog.user_id == current_user.id,
            MealLog.timestamp >= three_days_ago
        ).all()
        
        # Calculate average daily intake
        if recent_meals:
            meals_by_day = {}
            for meal in recent_meals:
                meal_date = meal.timestamp.date()
                if meal_date not in meals_by_day:
                    meals_by_day[meal_date] = []
                meals_by_day[meal_date].append(meal)
            
            # Calculate daily totals
            daily_protein = []
            daily_carbs = []
            
            for day, day_meals in meals_by_day.items():
                day_protein = sum(meal.protein or 0 for meal in day_meals)
                day_carbs = sum(meal.carbs or 0 for meal in day_meals)
                daily_protein.append(day_protein)
                daily_carbs.append(day_carbs)
            
            # Calculate averages
            avg_protein = sum(daily_protein) / len(daily_protein) if daily_protein else 75
            avg_carbs = sum(daily_carbs) / len(daily_carbs) if daily_carbs else 250
            
            # Update features with calculated values
            features.protein_intake = avg_protein
            features.carbs_intake = avg_carbs
        
        # Convert pydantic model to array expected by the model
        input_features = [
            features.age,
            features.gender,
            features.bmi,
            features.daily_activity,
            int(features.heart_disease),
            int(features.diabetes),
            int(features.smoking),
            int(features.alcohol),
            features.protein_intake,
            features.carbs_intake
        ]
        
        # Get classification result
        classification_result = model_loader.classify_user_health(input_features)
        
        # Extract classification and confidence from result
        classification = classification_result['classification']
        confidence = classification_result['confidence']  #none if not supported later
        
        # Save the classification to the database
        new_health_status = HealthStatus(
            user_id=current_user.id,
            classification=classification,
        )
        db.add(new_health_status)
        db.commit()
        db.refresh(new_health_status)  
        
        # Generate some basic recommendations based on classification
        recommendations = generate_recommendations(classification, features)
        
        # Return classification response
        return HealthClassificationResponse(
            classification=classification,
            confidence=confidence,  
            timestamp=datetime.now(),
            recommendations=recommendations
        )
    
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health classification model error: {str(ve)}"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification failed: {str(e)}"
        )

# Get model status endpoint
@router.get("/model-status")
async def health_model_status():
    if model_loader.health_classifier is None:
        return {"status": "error", "message": "Health classification model not loaded"}
    return {"status": "ok", "model_type": type(model_loader.health_classifier).__name__}

# Generate recommendations based on classification
def generate_recommendations(classification: str, features: HealthFeatures) -> List[str]:
    recommendations = []
    
    # Add general recommendations based on classification
    if classification == "Healthy":
        recommendations.append("Maintain your current healthy lifestyle")
    elif classification == "At Risk":
        recommendations.append("Consider increasing daily physical activity")
        if features.daily_activity < 30:
            recommendations.append("Aim for at least 30 minutes of exercise daily")
    elif classification == "Pre-diabetic":
        recommendations.append("Monitor carbohydrate intake")
        recommendations.append("Consider consulting with a healthcare provider")
    elif classification == "Needs Attention":
        recommendations.append("Schedule a check-up with your healthcare provider")
    
    # Add targeted recommendations based on specific features
    if features.smoking:
        recommendations.append("Consider reducing or quitting smoking")
    
    if features.alcohol:
        recommendations.append("Consider moderating alcohol consumption")
    
    if features.bmi > 25:
        recommendations.append("Consider weight management strategies")
    
    if features.daily_activity < 20:
        recommendations.append("Increasing physical activity can improve overall health")
    
    return recommendations 

# Update nutrient targets endpoint  
@router.post("/update-nutrient-targets", response_model=Dict[str, Any])
async def update_nutrient_targets(
    targets: NutrientTargetModel,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):

    try:
        # Check if user already has targets
        existing_targets = db.query(NutrientTarget).filter(
            NutrientTarget.user_id == current_user.id
        ).first()
        
        if existing_targets:
            # Update existing targets
            existing_targets.calories = targets.calories
            existing_targets.protein = targets.protein
            existing_targets.carbs = targets.carbs
            existing_targets.fats = targets.fats
            existing_targets.sugar = targets.sugar
            existing_targets.fiber = targets.fiber
            existing_targets.updated_at = datetime.now()
        else:
            # Create new targets
            new_targets = NutrientTarget(
                user_id=current_user.id,
                calories=targets.calories,
                protein=targets.protein,
                carbs=targets.carbs,
                fats=targets.fats,
                sugar=targets.sugar,
                fiber=targets.fiber
            )
            db.add(new_targets)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Nutrient targets updated successfully",
            "targets": {
                "calories": targets.calories,
                "protein": targets.protein,
                "carbs": targets.carbs, 
                "fats": targets.fats,
                "sugar": targets.sugar,
                "fiber": targets.fiber
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update nutrient targets: {str(e)}"
        )

# Get nutrient targets endpoint
@router.get("/nutrient-targets", response_model=Dict[str, Any])
async def get_nutrient_targets(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # Clear any cached entries
        db.expire_all()
        
        # Query for user's targets
        targets = db.query(NutrientTarget).filter(
            NutrientTarget.user_id == current_user.id
        ).first()
        
        if not targets:
            # Return defaults if no targets exist
            return {
                "success": True,
                "source": "defaults",
                "targets": {
                    "calories": 2100,
                    "protein": 90,
                    "carbs": 250,
                    "fats": 70,
                    "sugar": 30,
                    "fiber": 25
                }
            }
        
        # Return the targets
        return {
            "success": True,
            "source": "database",
            "targets": {
                "calories": targets.calories,
                "protein": targets.protein,
                "carbs": targets.carbs,
                "fats": targets.fats,
                "sugar": targets.sugar,
                "fiber": targets.fiber
            },
            "last_updated": targets.updated_at
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve nutrient targets: {str(e)}"
        )

# Get daily nutrient totals 
@router.get("/daily-nutrients", response_model=Dict[str, Any])
async def get_daily_nutrients(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        db.expire_all()
    
        today = datetime.now().date()
        
        # Query today's meal logs for the user
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        meal_logs = db.query(MealLog).filter(
            MealLog.user_id == current_user.id,
            MealLog.timestamp >= today_start,
            MealLog.timestamp <= today_end
        ).all()
        
        # Calculate totals
        nutrient_totals = {
            "calories": sum(meal.calories or 0 for meal in meal_logs),
            "protein": sum(meal.protein or 0 for meal in meal_logs),
            "carbs": sum(meal.carbs or 0 for meal in meal_logs),
            "fats": sum(meal.fat or 0 for meal in meal_logs),
            "sugar": sum(meal.sugar or 0 for meal in meal_logs),
            "fiber": sum(meal.fiber or 0 for meal in meal_logs)
        }
        
        # Get user's saved targets, if they exist
        saved_targets = db.query(NutrientTarget).filter(
            NutrientTarget.user_id == current_user.id
        ).first()
        
        # Use the saved targets if available, otherwise calculate dynamic targets
        if saved_targets:
            # Use saved targets from database
            daily_targets = {
                "calories": saved_targets.calories,
                "protein": saved_targets.protein,
                "carbs": saved_targets.carbs,
                "fats": saved_targets.fats,
                "sugar": saved_targets.sugar,
                "fiber": saved_targets.fiber
            }
        else:
            # Get the user's latest health status for dynamic calculation
            health_status = db.query(HealthStatus).filter(
                HealthStatus.user_id == current_user.id
            ).order_by(HealthStatus.date.desc()).first()
            
            classification = health_status.classification if health_status else "Unknown"
            
            # Get age and gender for personalized targets
            age = None
            gender = current_user.gender
            
            if current_user.date_of_birth:
                today = datetime.now().date()
                born = current_user.date_of_birth.date() if hasattr(current_user.date_of_birth, 'date') else current_user.date_of_birth
                age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
            
            # Set nutrient targets based on age, gender, and classification

            
            # Base calorie targets
            base_calories = 2000  # Default
            if gender == 1:  # Male
                if age and age < 30:
                    base_calories = 2500
                elif age and age < 50:
                    base_calories = 2300
                else:
                    base_calories = 2100
            elif gender == 2:  # Female
                if age and age < 30:
                    base_calories = 2000
                elif age and age < 50:
                    base_calories = 1900
                else:
                    base_calories = 1800
            
            # Adjust calories by classification
            if classification == "At Risk" or classification == "Unhealthy":
                base_calories = base_calories * 0.9  # Reduce by 10% for weight management
            
            # Set daily targets
            daily_targets = {
                "calories": base_calories,
                "protein": base_calories * 0.15 / 4, # 15% of calories from protein (4 cal/g)
                "carbs": base_calories * 0.55 / 4,    # 55% of calories from carbs (4 cal/g)
                "fats": base_calories * 0.3 / 9,     # 30% of calories from fats (9 cal/g)
                "sugar": 30 if gender == 1 else 25,   # Male: 30g, Female: 25g
                "fiber": 38 if gender == 1 else 25    # Male: 38g, Female: 25g
            }
        
        # Calculate percentages
        nutrient_percentages = {}
        for nutrient, total in nutrient_totals.items():
            target = daily_targets.get(nutrient, 1)  # Avoid division by zero
            percent = (total / target) * 100 if target > 0 else 0
            nutrient_percentages[nutrient] = min(round(percent), 100)
        
        # Return the data
        return {
            "current": nutrient_totals,
            "target": daily_targets,
            "percent": nutrient_percentages
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate daily nutrients: {str(e)}"
        ) 

# Get health history endpoint
@router.get("/history", response_model=List[HealthStatusResponse])
async def get_health_history(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Query the database for health status history
    health_history = db.query(HealthStatus).filter(
        HealthStatus.user_id == current_user.id
    ).order_by(
        HealthStatus.date.desc()
    ).limit(limit).all()
    
    if not health_history:
        return []
    # Return a list of health statuses
    return [
        HealthStatusResponse(
            id=status.id,
            classification=status.classification,
            date=status.date
        ) for status in health_history
    ] 