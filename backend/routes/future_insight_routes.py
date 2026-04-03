from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import os
import requests
import json
from dotenv import load_dotenv

from database.database import get_db
from database.models import User, MealLog, HealthStatus, FamilyHistory, FutureHealthInsight
from middleware.auth_middleware import get_current_active_user
from ml import model_loader

# Load environment variables
load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

router = APIRouter(
    prefix="/future-insights",
    tags=["future-insights"],
    responses={404: {"description": "Not found"}},
)
# Future insight response model         
class FutureInsightResponse(BaseModel):
    prediction_date: datetime
    long_term_predictions: List[Dict[str, Any]]
    disease_prevention_insights: List[str]
    lifestyle_trajectory: Dict[str, Any]
    actionable_recommendations: List[str]
    meal_recommendation: str

# Test endpoint to check if the future insights route is working correctly
@router.get("/test", status_code=200)
async def test_future_insights_endpoint():
    return {"status": "operational", "message": "Future health insights API is working"}

# Get future health insights endpoint
@router.get("", response_model=FutureInsightResponse)
async def get_future_insights(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # First, try to get the latest insights from the database
    latest_insights = db.query(FutureHealthInsight).filter(
        FutureHealthInsight.user_id == current_user.id
    ).order_by(
        FutureHealthInsight.last_generated.desc()
    ).first()
    
    # If insights exist in the database, return them
    if latest_insights:
        try:
            insights_data = json.loads(latest_insights.insight_data)
            return {
                "prediction_date": latest_insights.prediction_date,
                "long_term_predictions": insights_data.get("long_term_predictions", []),
                "disease_prevention_insights": insights_data.get("disease_prevention_insights", []),
                "lifestyle_trajectory": insights_data.get("lifestyle_trajectory", {}),
                "actionable_recommendations": insights_data.get("actionable_recommendations", []),
                "meal_recommendation": insights_data.get("meal_recommendation", "")
            }
        except (json.JSONDecodeError, AttributeError) as e:
            print(f"Error parsing stored insights: {str(e)}")
            # If there's an error parsing the stored data, continue to generate new insights
    
    # If no insights exist or there was an error parsing them, generate new ones
    return await generate_future_insights_internal(current_user, db)

async def generate_future_insights_internal(current_user: User, db: Session):
    # Get user's meal history and health status data
    try:
        meal_logs = db.query(MealLog).filter(
            MealLog.user_id == current_user.id
        ).order_by(
            MealLog.timestamp.desc()
        ).limit(20).all()
        
        health_statuses = db.query(HealthStatus).filter(
            HealthStatus.user_id == current_user.id
        ).order_by(
            HealthStatus.date.desc()
        ).limit(5).all()
    except Exception as e:
        print(f"Database error when retrieving user data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    
    # Check if there is enough data
    if not meal_logs or not health_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough data to generate future insights. Please log more meals and get health status classifications."
        )
    
    # Calculate average nutrient intake
    total_calories = total_protein = total_fat = total_carbs = 0
    avg_calories = avg_protein = avg_fat = avg_carbs = "Unknown"
    
    if meal_logs and len(meal_logs) > 0:
        for log in meal_logs:
            total_calories += log.calories if log.calories else 0
            total_protein += log.protein if log.protein else 0
            total_fat += log.fat if log.fat else 0
            total_carbs += log.carbs if log.carbs else 0
        
        # Calculate averages
        num_logs = len(meal_logs)
        if num_logs > 0:  # Extra safeguard
            avg_calories = f"{total_calories / num_logs:.1f}"
            avg_protein = f"{total_protein / num_logs:.1f}"
            avg_fat = f"{total_fat / num_logs:.1f}"
            avg_carbs = f"{total_carbs / num_logs:.1f}"
    
    # Get latest health classification
    latest_health_status = health_statuses[0].classification if health_statuses else "Unknown"
    
    # Prepare health-related features for the prediction
    health_conditions = []
    if current_user.heart_disease:
        health_conditions.append("heart disease")
    if current_user.diabetes:
        health_conditions.append("diabetes")
    
    # Get the user's family health history
    try:
        family_history = db.query(FamilyHistory).filter(FamilyHistory.user_id == current_user.id).first()
        family_history_text = ""
        
        if family_history:
            family_conditions = []
            
            if family_history.heart_disease:
                family_conditions.append("heart disease")
            if family_history.diabetes:
                family_conditions.append("diabetes")
            if family_history.cancer:
                family_conditions.append("cancer")
            if family_history.hypertension:
                family_conditions.append("hypertension")
            if family_history.stroke:
                family_conditions.append("stroke")
            if family_history.other:
                family_conditions.append(f"other conditions ({family_history.other})")
            
            if family_conditions:
                family_members = []
                relations = []
                
                if family_history.relation_type:
                    try:
                        relations_data = json.loads(family_history.relation_type)
                        for relation, conditions in relations_data.items():
                            if conditions:
                                family_members.append(f"{relation} ({', '.join(conditions)})")
                    except json.JSONDecodeError:
                        # Log specific JSON parsing error
                        print(f"Error parsing family history relations: Invalid JSON format in {family_history.relation_type}")
                        family_members.append("Unspecified family members")
                
                if family_members:
                    family_history_text = f"Family history of {', '.join(family_conditions)} in {', '.join(family_members)}."
                else:
                    family_history_text = f"Family history of {', '.join(family_conditions)}."
            else:
                family_history_text = "No significant family history reported."
        else:
            # Fallback to user's family_history field
            if current_user.family_history:
                try:
                    # Try to parse the JSON stored in the user model
                    fh_data = json.loads(current_user.family_history)
                    conditions = []
                    for condition, value in fh_data.items():
                        if value:
                            conditions.append(condition.replace("_", " "))
                    
                    if conditions:
                        family_history_text = f"Family history of {', '.join(conditions)}."
                    else:
                        family_history_text = "No significant family history reported."
                except json.JSONDecodeError:
                    # If not JSON, use as plain text
                    family_history_text = current_user.family_history
            else:
                family_history_text = "No family history data available."
    except Exception as e:
        # Log the specific exception for debugging
        print(f"Error processing family history: {str(e)}")
        # Fallback to simple family history from user model
        family_history_text = current_user.family_history if current_user.family_history else "No family history data available."
    
    # Lifestyle factors
    lifestyle_factors = []
    if current_user.smoking:
        lifestyle_factors.append("smoking")
    if current_user.alcohol:
        lifestyle_factors.append("alcohol consumption")
    
    try:
        # Format user data for prompt
        user_age = None
        if current_user.date_of_birth:
            today = datetime.now()
            user_age = today.year - current_user.date_of_birth.year - ((today.month, today.day) < (current_user.date_of_birth.month, current_user.date_of_birth.day))
        
        gender = "Male" if current_user.gender == 1 else "Female" if current_user.gender == 2 else "Unknown"
        
        # Check for DeepSeek API key
        if not DEEPSEEK_API_KEY:
            print("DeepSeek API key not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="DeepSeek API key not configured"
            )
        
        # Calculate BMI
        bmi = "Unknown"
        if current_user.weight and current_user.height and current_user.height > 0:
            bmi = f"{current_user.weight / ((current_user.height/100) ** 2):.1f}"
        
        # Construct prompt for DeepSeek
        prompt = f'''
        Based on the following user health data, provide future health insights:
        
        User Profile:
        - Age: {user_age or 'Unknown'}
        - Gender: {gender}
        - BMI: {bmi}
        - Daily physical activity: {current_user.daily_physical_activity or 0} minutes/day
        - Health conditions: {', '.join(health_conditions) if health_conditions else 'None'}
        - Family history: {family_history_text}
        - Lifestyle factors: {', '.join(lifestyle_factors) if lifestyle_factors else 'None'}
        - Dietary restrictions: {current_user.restrictions or 'None'}
        
        Nutrition (Daily Average):
        - Calories: {avg_calories} kcal
        - Protein: {avg_protein} g
        - Fat: {avg_fat} g
        - Carbohydrates: {avg_carbs} g
        
        Current health classification: {latest_health_status}
        
        Based on this data, provide:
        1. Long-term health predictions (3-5 years)
        2. Disease prevention insights
        3. Diet and lifestyle trajectory
        4. Actionable recommendations
        
        Format your response as a structured JSON with these keys:
        - long_term_predictions: Array of objects with timeframe, health_outcome, and probability fields
        - disease_prevention_insights: Array of strings with prevention recommendations
        - lifestyle_trajectory: Object with weight_trend, fitness_projection, nutrition_quality, and long_term_outlook fields
        - actionable_recommendations: Array of strings with specific actions the user should take
        - meal_recommendation: A string containing personalized meal recommendation
        '''
        
        # Call DeepSeek API with timeout
        try:
            response = requests.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5,
                    "max_tokens": 2000
                },
                timeout=90  
            )
            response.raise_for_status()
        except requests.exceptions.Timeout:
            print("DeepSeek API request timed out")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="AI service timed out. Please try again later."
            )
        except requests.exceptions.RequestException as e:
            print(f"DeepSeek API request failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service unavailable: {str(e)}"
            )
            
        # Parse response
        try:
            result = response.json()
        except json.JSONDecodeError:
            print(f"Failed to parse DeepSeek API response: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid response from DeepSeek API"
            )
        
        if "choices" not in result or not result["choices"]:
            print(f"Invalid DeepSeek API response format: {result}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid response format from DeepSeek API"
            )
        
        # Extract and parse the JSON response
        content = result["choices"][0]["message"]["content"]
        try:
            # First try direct JSON parsing
            insights_data = json.loads(content)
        except json.JSONDecodeError:
            # If direct parsing fails, try to extract JSON with regex
            import re
            json_match = re.search(r'(\{[\s\S]*\})', content)
            if json_match:
                try:
                    # Clean up the extracted JSON string
                    cleaned_json = json_match.group(1).replace('\n', ' ').replace('\r', '')
                    insights_data = json.loads(cleaned_json)
                except json.JSONDecodeError:
                    print(f"Failed to extract JSON from content: {content}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to parse future insights data from API response"
                    )
            else:
                print(f"No JSON found in content: {content}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to extract JSON from API response"
                )
        
        # Ensure all required fields are present
        required_fields = [
            "long_term_predictions",
            "disease_prevention_insights", 
            "lifestyle_trajectory", 
            "actionable_recommendations",
            "meal_recommendation"
        ]
        
        for field in required_fields:
            if field not in insights_data:
                if field == "lifestyle_trajectory":
                    insights_data[field] = {}
                elif field == "meal_recommendation":
                    insights_data[field] = ""
                else:
                    insights_data[field] = []
        
        now = datetime.now()
        
        # Store the insights in the database
        try:
            # Check if record exists
            existing_insight = db.query(FutureHealthInsight).filter(
                FutureHealthInsight.user_id == current_user.id
            ).first()
            
            if existing_insight:
                # Update existing record
                existing_insight.insight_data = json.dumps(insights_data)
                existing_insight.prediction_date = now
                existing_insight.last_generated = now
                existing_insight.updated_at = now
            else:
                # Create new record
                new_insight = FutureHealthInsight(
                    user_id=current_user.id,
                    insight_data=json.dumps(insights_data),
                    prediction_date=now,
                    last_generated=now
                )
                db.add(new_insight)
            
            db.commit()
            
        except Exception as db_error:
            db.rollback()
            print(f"Error saving insights to database: {str(db_error)}")
        
        # Return the insights data
        return {
            "prediction_date": now,
            "long_term_predictions": insights_data["long_term_predictions"],
            "disease_prevention_insights": insights_data["disease_prevention_insights"],
            "lifestyle_trajectory": insights_data["lifestyle_trajectory"],
            "actionable_recommendations": insights_data["actionable_recommendations"],
            "meal_recommendation": insights_data["meal_recommendation"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in future health insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate future health insights: {str(e)}"
        )

@router.post("/generate", response_model=FutureInsightResponse)
async def generate_future_insights(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Generate and store new insights
    return await generate_future_insights_internal(current_user, db) 