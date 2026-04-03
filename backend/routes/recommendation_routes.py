from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import os
import requests
import json
import re
from dotenv import load_dotenv
import traceback
import time
import logging
import sys
import fastapi
import sqlalchemy

from database.database import get_db
from database.models import User, Recommendation, MealLog
from middleware.auth_middleware import get_current_active_user
from ml import model_loader

# Load environment variables
load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
    responses={404: {"description": "Not found"}},
)

# Models for recommendation operations
class RecommendationResponse(BaseModel):
    id: int
    meal_name: str
    recipe: str
    nutrient_score: Optional[float] = None
    
    # Detailed scoring breakdown
    nutrient_adequacy_score: Optional[float] = None
    meal_balance_score: Optional[float] = None
    health_impact_score: Optional[float] = None
    personalization_score: Optional[float] = None
    score_explanation: Optional[str] = None
    
    # Add fields for calories and macronutrients
    calories: Optional[float] = 0
    protein: Optional[float] = 0
    carbs: Optional[float] = 0
    fats: Optional[float] = 0
    fiber: Optional[float] = 0
    
    created_at: datetime
    is_disliked: bool = False

    class Config:
        orm_mode = True

class RecommendationGenerationParams(BaseModel):
    dietary_restriction: Optional[str] = None
    food_allergies: Optional[str] = None
    health_condition: Optional[str] = None
    count: int = 3

def ensure_recipe_structure(recipe_content):
    print(f"ensure_recipe_structure called with type: {type(recipe_content)}")
    
    # Handle None or empty case
    if recipe_content is None:
        print("Recipe content is None, returning empty structure")
        return {
            "ingredients": [],
            "instructions": ["No recipe data available"]
        }
        

    if isinstance(recipe_content, dict):
        print("Recipe content is a dictionary")
        # Ensure ingredients and instructions keys exist
        recipe_dict = {
            "ingredients": recipe_content.get("ingredients", []),
            "instructions": recipe_content.get("instructions", [])
        }
        
        # Convert to lists if not already
        if not isinstance(recipe_dict["ingredients"], list):
            recipe_dict["ingredients"] = [str(recipe_dict["ingredients"])]
            
        if not isinstance(recipe_dict["instructions"], list):
            recipe_dict["instructions"] = [str(recipe_dict["instructions"])]
            
        return recipe_dict
    
    # Handle string recipe content
    try:
        recipe_text = str(recipe_content)
        print(f"Processing recipe text: {recipe_text[:100]}...")
        
        # Try to parse as JSON first
        try:
            recipe_json = json.loads(recipe_text)
            print("Successfully parsed recipe as JSON")
            
            # If parsed as dictionary with the right structure, use it
            if isinstance(recipe_json, dict):
                return ensure_recipe_structure(recipe_json)  # Reuse the dict handling code
        except json.JSONDecodeError:
            pass
        
        # Try to parse ingredients and instructions from text
        ingredients_match = re.search(r'Ingredients:([\s\S]*?)(?:Instructions:|$)', recipe_text)
        instructions_match = re.search(r'Instructions:([\s\S]*)', recipe_text)
        
        ingredients = []
        instructions = []
        
        if ingredients_match:
            ingredients_text = ingredients_match.group(1).strip()
            ingredients = [
                line.replace('-', '').strip() 
                for line in ingredients_text.split('\n') 
                if line.strip()
            ]
            print(f"Extracted {len(ingredients)} ingredients")
        
        if instructions_match:
            instructions_text = instructions_match.group(1).strip()
            instructions = [
                re.sub(r'^\d+\.\s*', '', line).strip() 
                for line in instructions_text.split('\n') 
                if line.strip()
            ]
            print(f"Extracted {len(instructions)} instructions")
        

        if not ingredients and not instructions:
            print("Could not extract structured content, using full text")
            instructions = [recipe_text]
        
        # Return structured recipe
        return {
            "ingredients": ingredients,
            "instructions": instructions
        }
    except Exception as e:
        print(f"Error in ensure_recipe_structure: {str(e)}")
        # Return a fallback structure
        return {
            "ingredients": [],
            "instructions": ["Recipe could not be processed properly"]
        }

# Generate random inspiration
def get_random_inspiration():
    """Generate random inspiration for recipe generation to increase variety"""
    cuisines = ["Mediterranean", "Asian fusion", "Latin American", "Middle Eastern", 
                "Indian", "Caribbean", "Scandinavian", "African", "Japanese", "Greek"]
    cooking_methods = ["slow-cooked", "grilled", "roasted", "steamed", "stir-fried", 
                      "baked", "raw", "fermented", "air-fried", "pressure-cooked"]
    focuses = ["protein-rich", "fiber-packed", "heart-healthy", "anti-inflammatory", 
              "gut-friendly", "brain-boosting", "energy-lifting", "immunity-enhancing"]
    
    # Select random elements
    import random
    cuisine = random.choice(cuisines)
    method = random.choice(cooking_methods)
    focus = random.choice(focuses)
    
    # Generate randomized instruction
    return f"{cuisine}-inspired {method} recipes with {focus} ingredients"

# Get recommendations endpoint
@router.get("", response_model=List[RecommendationResponse])
async def get_recommendations(
    count: int = Query(3, ge=1, le=10, description="Number of recommendations to return"),
    regenerate: bool = Query(False, description="Whether to regenerate recommendations"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # If regenerate is true, mark all existing recommendations as disliked
    if regenerate:
        print(f"Regenerating recommendations for user {current_user.id}")
        # Find the most recent recommendations that are not disliked
        existing_recommendations = db.query(Recommendation).filter(
            Recommendation.user_id == current_user.id,
            Recommendation.is_disliked == False
        ).all()
        
        for rec in existing_recommendations:
            rec.is_disliked = True
        
        # Commit the changes
        db.commit()
        print(f"Marked {len(existing_recommendations)} existing recommendations as disliked")
    else:
        # Get existing recommendations that are not disliked
        existing_recommendations = db.query(Recommendation).filter(
            Recommendation.user_id == current_user.id,
            Recommendation.is_disliked == False
        ).order_by(
            Recommendation.created_at.desc()
        ).limit(count).all()
        
        # If there are enough recommendations, return them
        if len(existing_recommendations) >= count:
            print(f"Returning {len(existing_recommendations)} existing recommendations")
            return existing_recommendations
    
    # Generate new
    # Prepare parameters for DeepSeek API
    dietary_restriction = current_user.restrictions or "None"
    food_allergies = current_user.allergies or "None"
    health_conditions = []
    if current_user.heart_disease:
        health_conditions.append("heart disease")
    if current_user.diabetes:
        health_conditions.append("diabetes")
    health_condition_text = ", ".join(health_conditions) if health_conditions else "None"

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    random_seed = int(datetime.now().timestamp())
    random_inspiration = get_random_inspiration()
    
    # prompt for DeepSeek
    prompt = f"""
    Generate {count} unique and creative healthy meal recommendations with the following constraints:
    
    Time: {current_time}
    Random seed: {random_seed}
    Inspiration: {random_inspiration}
    Dietary restrictions: {dietary_restriction}
    Food allergies: {food_allergies}
    Health conditions: {health_condition_text}
    
    For each meal, provide:
    1. A creative meal name
    2. A recipe with ingredients and instructions
    3. A scientifically-based dietary impact score based on the framework below
    4. Calories and macronutrient breakdown (protein, carbs, fats, fiber)
    
    SCIENTIFICALLY-BASED DIETARY IMPACT SCORING FRAMEWORK:
    {{
      "action": "score_meal",
      "framework": "scientifically_based_dietary_impact",
      "criteria": {{
        "nutrient_adequacy": {{
          "weight": 40,
          "considerations": [
            "Protein: grams vs. 0.8 g/kg (30% of daily need per meal)",
            "Carbs quality: glycemic index/load or fiber:carb ratio",
            "Fats: ratio of unsaturated to saturated fats; added sugars ≤ 10% kcal",
            "Fiber: g per 1000 kcal (target 14 g/1000 kcal)",
            "Micronutrients: % RDA coverage for key vitamins/minerals"
          ]
        }},
        "meal_balance": {{
          "weight": 20,
          "considerations": [
            "Plate proportions per Harvard Healthy Eating Plate: 50% veg/fruits, 25% whole grains, 25% protein",
            "Presence of healthy oils",
            "Choice of water or unsweetened beverages"
          ]
        }},
        "health_impact": {{
          "weight": 20,
          "considerations": [
            "Anti‑inflammatory foods (e.g. turmeric, berries, olive oil)",
            "Antioxidant content (ORAC‑rich items)",
            "Heart‑health (omega‑3 sources, plant sterols, low sat‑fat)",
            "Blood sugar regulation (low GI/GL, protein/fiber boosts)"
          ]
        }},
        "personalization": {{
          "weight": 20,
          "considerations": [
            "Alignment with user health conditions (e.g. diabetes, CVD)",
            "Compliance with dietary restrictions/allergies",
            "Calorie match vs. user's daily goal (25–35% per meal)",
            "Support for activity level (protein & carb needs)"
          ]
        }}
      }},
      "output": ["total_score_0_100", "subscores", "brief_explanation_for_each_subscore"]
    }}
    
    Format your response as a proper JSON array of objects with these exact keys: "meal_name", "recipe", "nutrient_score", "nutrient_adequacy_score", "meal_balance_score", "health_impact_score", "personalization_score", "score_explanation", "calories", "protein", "carbs", "fats", "fiber".
    
    For the recipe field, structure it as a nested object with "ingredients" (array of strings) and "instructions" (array of strings).
    For the score_explanation field, provide a brief 2-3 sentence explanation of the score breakdown.
    
    Example:
    [
      {{
        "meal_name": "Mediterranean Quinoa Bowl",
        "recipe": {{
          "ingredients": ["1 cup cooked quinoa", "1/4 cup diced cucumber"],
          "instructions": ["Mix all ingredients", "Serve immediately"]
        }},
        "nutrient_score": 85,
        "nutrient_adequacy_score": 35,
        "meal_balance_score": 18,
        "health_impact_score": 17,
        "personalization_score": 15,
        "score_explanation": "High in fiber and plant protein with excellent micronutrient coverage. Well-balanced plate proportions with anti-inflammatory ingredients. Complies with dietary restrictions and supports activity needs.",
        "calories": 320,
        "protein": 12,
        "carbs": 45,
        "fats": 10,
        "fiber": 6
      }}
    ]
    """
    
    # Call DeepSeek API
    if not DEEPSEEK_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DeepSeek API key not configured"
        )
    
    print(f"Calling DeepSeek API with inspiration: {random_inspiration}...")
    
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
                "temperature": 0.9, #made higher for more variety
                "max_tokens": 2000
            },
            timeout=60
        )
        
        response.raise_for_status()
        result = response.json()
        
        if "choices" not in result or not result["choices"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid response from DeepSeek API"
            )
    except Exception as e:
        print(f"Error calling DeepSeek API: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calling DeepSeek API: {str(e)}"
        )
    
    # Extract the content from the response
    content = result["choices"][0]["message"]["content"]
    print(f"Raw API response: {content[:100]}...")
    
    # debugging
    print("=== FULL API RESPONSE ===")
    print(content)
    print("=== END API RESPONSE ===")
    
    # Process the content to extract valid JSON
    try:
        content = re.sub(r'```(?:json)?\n|\n```', '', content)
        
        recommendations_data = json.loads(content)
        print(f"Successfully parsed JSON response with {len(recommendations_data)} recommendations")
        
        # debugging
        if recommendations_data and len(recommendations_data) > 0:
            print(f"First recommendation structure: {json.dumps(recommendations_data[0], indent=2)}")
            print(f"Recipe field type: {type(recommendations_data[0].get('recipe', ''))}")
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {str(e)}. Attempting to extract JSON...")
        try:
            # Try to extract JSON array from text
            json_match = re.search(r'\[\s*{.*}\s*\]', content.replace('\n', ' '), re.DOTALL)
            if json_match:
                content = json_match.group(0)
                
                # Fix common JSON issues
                content = re.sub(r'([{,]\s*)(\w+)(\s*:)', r'\1"\2"\3', content)  # Add quotes to keys
                content = content.replace("'", '"')  # Replace single quotes with double quotes
                
                recommendations_data = json.loads(content)
                print(f"Successfully extracted and parsed JSON with {len(recommendations_data)} recommendations")
            else:
                raise ValueError("Could not extract JSON array from response")
        except Exception as ex:
            print(f"Failed to extract and parse JSON: {str(ex)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse recommendation data: {str(ex)}"
            )
    
    # Validate and process the recommendations
    print("Processing and saving recommendations...")
    new_recommendations = []
    for rec_data in recommendations_data[:count]:
        try:
            # Validate required fields
            if "meal_name" not in rec_data:
                print(f"Missing meal_name in recommendation: {rec_data}")
                continue
                
            if "recipe" not in rec_data:
                print(f"Missing recipe in recommendation: {rec_data}")
                continue
                
            if "nutrient_score" not in rec_data:
                print(f"Missing nutrient_score in recommendation: {rec_data}")
                continue
            
            # Get recipe 
            recipe = rec_data["recipe"]
            print(f"Original recipe type: {type(recipe)}, value: {str(recipe)[:100]}")
            
            if isinstance(recipe, dict):
                print("Recipe is a dictionary, converting to JSON string")
                recipe_dict = {
                    "ingredients": recipe.get("ingredients", []),
                    "instructions": recipe.get("instructions", [])
                }
                
                # Convert non-list to lists
                if not isinstance(recipe_dict["ingredients"], list):
                    recipe_dict["ingredients"] = [str(recipe_dict["ingredients"])]
                    
                if not isinstance(recipe_dict["instructions"], list):
                    recipe_dict["instructions"] = [str(recipe_dict["instructions"])]
                
                recipe_json = json.dumps(recipe_dict)
                print(f"Converted recipe to JSON string: {recipe_json[:100]}")
            else:
                print("Recipe is not a dictionary, attempting to process as string")
                # It's already a string, try to parse and validate
                try:
                    recipe_obj = json.loads(recipe)
                    print("Successfully parsed recipe string as JSON")
                    
                    recipe_dict = {
                        "ingredients": recipe_obj.get("ingredients", []),
                        "instructions": recipe_obj.get("instructions", [])
                    }
                    
                    # Convert non-list to lists
                    if not isinstance(recipe_dict["ingredients"], list):
                        recipe_dict["ingredients"] = [str(recipe_dict["ingredients"])]
                        
                    if not isinstance(recipe_dict["instructions"], list):
                        recipe_dict["instructions"] = [str(recipe_dict["instructions"])]
                    
                    # Convert back to JSON string
                    recipe_json = json.dumps(recipe_dict)
                    print(f"Structured recipe JSON: {recipe_json[:100]}")
                except json.JSONDecodeError as je:
                    print(f"JSON decode error: {str(je)}")

                    structured_recipe = ensure_recipe_structure(recipe)
                    recipe_json = json.dumps(structured_recipe)
                    print(f"Created structured recipe using text processing: {recipe_json[:100]}")
                except Exception as ex:
                    print(f"Unexpected error processing recipe: {str(ex)}")

                    recipe_json = json.dumps({"ingredients": [], "instructions": [str(recipe)]})
                    print(f"Using fallback simple string conversion: {recipe_json[:100]}")
            
            # Create and save the recommendation
            try:
                print(f"Creating recommendation with meal_name: {rec_data['meal_name']}, nutrient_score: {rec_data['nutrient_score']}")
                new_rec = Recommendation(
                    user_id=current_user.id,
                    meal_name=rec_data["meal_name"],
                    recipe=recipe_json,
                    nutrient_score=float(rec_data["nutrient_score"]),
                    
                    # Add detailed scoring breakdown
                    nutrient_adequacy_score=float(rec_data.get("nutrient_adequacy_score", 0)),
                    meal_balance_score=float(rec_data.get("meal_balance_score", 0)),
                    health_impact_score=float(rec_data.get("health_impact_score", 0)),
                    personalization_score=float(rec_data.get("personalization_score", 0)),
                    score_explanation=rec_data.get("score_explanation", ""),
                    
                    # Add macronutrient information
                    calories=float(rec_data.get("calories", 0)),
                    protein=float(rec_data.get("protein", 0)),
                    carbs=float(rec_data.get("carbs", 0)),
                    fats=float(rec_data.get("fats", 0)),
                    fiber=float(rec_data.get("fiber", 0)),
                    
                    is_disliked=False
                )
                
                db.add(new_rec)
                new_recommendations.append(new_rec)
                print("Successfully added recommendation to session")
            except Exception as e:
                print(f"Error creating recommendation object: {str(e)}")
                continue
        except Exception as e:
            print(f"Error processing recommendation: {str(e)}")
            try:
                # Attempt to save a simplified version of the recommendation if possible
                if "meal_name" in rec_data:
                    print(f"Attempting to save simplified version of recommendation for {rec_data['meal_name']}")
                    simple_recipe = json.dumps({"ingredients": [], "instructions": ["Recipe data could not be processed."]})
                    nutrient_score = float(rec_data.get("nutrient_score", 50))
                    
                    new_rec = Recommendation(
                        user_id=current_user.id,
                        meal_name=rec_data["meal_name"],
                        recipe=simple_recipe,
                        nutrient_score=nutrient_score,
                        
                        # Add default detailed scoring breakdown
                        nutrient_adequacy_score=float(rec_data.get("nutrient_adequacy_score", 20)),
                        meal_balance_score=float(rec_data.get("meal_balance_score", 10)),
                        health_impact_score=float(rec_data.get("health_impact_score", 10)),
                        personalization_score=float(rec_data.get("personalization_score", 10)),
                        score_explanation=rec_data.get("score_explanation", "Default scoring breakdown used."),
                        
                        # Add default macronutrient information
                        calories=float(rec_data.get("calories", 300)),
                        protein=float(rec_data.get("protein", 15)),
                        carbs=float(rec_data.get("carbs", 30)),
                        fats=float(rec_data.get("fats", 10)),
                        fiber=float(rec_data.get("fiber", 5)),
                        
                        is_disliked=False
                    )
                    
                    db.add(new_rec)
                    new_recommendations.append(new_rec)
                    print("Successfully added simplified recommendation to session")
            except Exception as fallback_error:
                print(f"Failed to create simplified recommendation: {str(fallback_error)}")
            continue
    
    # If no valid recommendations were processed, raise an error
    if not new_recommendations:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate any valid recommendations"
        )
    
    # Ensure recipe fields are strings before committing
    try:
        for rec in new_recommendations:
            if not isinstance(rec.recipe, str):
                print(f"Warning: Recipe field is not a string! Type: {type(rec.recipe)}")

                rec.recipe = json.dumps({"ingredients": [], "instructions": ["Recipe conversion failed"]})
                print("Converted recipe field to string")
                
        db.commit()
        for rec in new_recommendations:
            db.refresh(rec)
        
        print(f"Successfully saved {len(new_recommendations)} recommendations")
        return new_recommendations
    except Exception as e:
        db.rollback()
        print(f"Database error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving recommendations: {str(e)}"
        )

# Dislike recommendation endpoint
@router.post("/dislike/{recommendation_id}", response_model=RecommendationResponse)
async def dislike_recommendation(
    recommendation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Find the recommendation
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id,
        Recommendation.user_id == current_user.id
    ).first()
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    # Mark as disliked
    recommendation.is_disliked = True
    db.commit()
    db.refresh(recommendation)
    
    return recommendation

# Admin endpoint to verify and repair recommendation recipes in the database
@router.post("/admin/repair-recipes", response_model=dict)
async def repair_recommendation_recipes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action"
        )
    
    # Get all recommendations
    recommendations = db.query(Recommendation).all()
    print(f"Found {len(recommendations)} recommendations to check")
    
    repaired_count = 0
    failed_count = 0
    already_valid_count = 0
    
    # Check and repair each recommendation
    for rec in recommendations:
        try:
            # Check if recipe already a valid JSON string
            is_valid_json = False
            try:
                # Try to parse
                json.loads(rec.recipe)
                is_valid_json = True
            except (json.JSONDecodeError, TypeError):
                is_valid_json = False
                
            if is_valid_json:
                already_valid_count += 1
                continue
            
            # If not valid repair it
            print(f"Repairing recipe for recommendation ID {rec.id}")
            
            structured_recipe = ensure_recipe_structure(rec.recipe)

            recipe_json = json.dumps(structured_recipe)

            rec.recipe = recipe_json
            repaired_count += 1
            
        except Exception as e:
            print(f"Failed to repair recommendation ID {rec.id}: {str(e)}")
            try:
                rec.recipe = json.dumps({
                    "ingredients": [],
                    "instructions": ["Recipe data could not be repaired"]
                })
                repaired_count += 1
            except Exception:
                failed_count += 1

    if repaired_count > 0:
        try:
            db.commit()
            print(f"Successfully repaired {repaired_count} recommendations")
        except Exception as e:
            db.rollback()
            print(f"Error committing changes: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving repaired recommendations: {str(e)}"
            )
    
    return {
        "total_checked": len(recommendations),
        "already_valid": already_valid_count,
        "repaired": repaired_count,
        "failed": failed_count
    }

# Debug endpoint
@router.get("/debug")
def get_debug_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Get recent recommendations for the user
        recent_recommendations = db.query(Recommendation).filter(
            Recommendation.user_id == current_user.id
        ).order_by(Recommendation.created_at.desc()).limit(5).all()
        
        # Format recommendations for display
        formatted_recommendations = []
        for rec in recent_recommendations:
            try:
                recipe = rec.recipe
                if isinstance(recipe, str):
                    try:
                        recipe = json.loads(recipe)
                    except:
                        pass
                
                formatted_recommendations.append({
                    "id": rec.id,
                    "meal_name": rec.meal_name,
                    "recipe": recipe,
                    "nutrient_score": rec.nutrient_score,
                    "disliked": rec.is_disliked,
                    "created_at": str(rec.created_at)
                })
            except Exception as e:
                formatted_recommendations.append({
                    "id": rec.id,
                    "error": f"Error formatting recommendation: {str(e)}"
                })
        
        # Get last API response logs
        api_logs = []
        try:
            with open("logs/api_responses.log", "r") as f:
                api_logs = list(f.readlines())[-10:]
        except Exception as e:
            api_logs = [f"Error reading API logs: {str(e)}"]
            
        return {
            "user_id": current_user.id,
            "recent_recommendations": formatted_recommendations,
            "api_logs": api_logs,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Error in debug endpoint: {str(e)}\n{traceback.format_exc()}")
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        } 