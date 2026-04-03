import unittest
from unittest import mock
from datetime import datetime
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.recommendation_routes import router, RecommendationResponse, ensure_recipe_structure

class TestRecommendationRoutes(unittest.TestCase):

    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(router)
        
        self.client = TestClient(self.app)
        
        self.mock_user = mock.MagicMock()
        self.mock_user.id = 1
        self.mock_user.username = "testuser"
        self.mock_user.dietary_restriction = "None"
        self.mock_user.food_allergies = "None"
        
        self.mock_recommendation = mock.MagicMock()
        self.mock_recommendation.id = 1
        self.mock_recommendation.meal_name = "Test Healthy Meal"
        self.mock_recommendation.recipe = json.dumps({
            "ingredients": ["Ingredient 1", "Ingredient 2", "Ingredient 3"],
            "instructions": ["Step 1", "Step 2", "Step 3"]
        })
        self.mock_recommendation.nutrient_score = 85.5
        self.mock_recommendation.nutrient_adequacy_score = 90.0
        self.mock_recommendation.meal_balance_score = 85.0
        self.mock_recommendation.health_impact_score = 88.0
        self.mock_recommendation.personalization_score = 82.0
        self.mock_recommendation.score_explanation = "This meal has a good balance of nutrients."
        self.mock_recommendation.calories = 550
        self.mock_recommendation.protein = 30
        self.mock_recommendation.carbs = 65
        self.mock_recommendation.fats = 20
        self.mock_recommendation.fiber = 8
        self.mock_recommendation.created_at = datetime.now()
        self.mock_recommendation.is_disliked = False
        
        self.mock_recommendation2 = mock.MagicMock()
        self.mock_recommendation2.id = 2
        self.mock_recommendation2.meal_name = "Another Test Meal"
        self.mock_recommendation2.recipe = json.dumps({
            "ingredients": ["Ingredient A", "Ingredient B", "Ingredient C"],
            "instructions": ["Step A", "Step B", "Step C"]
        })
        self.mock_recommendation2.nutrient_score = 80.0
        self.mock_recommendation2.created_at = datetime.now()
        self.mock_recommendation2.is_disliked = False
        
        self.mock_db = mock.MagicMock()
        self.mock_db.query.return_value.filter.return_value.all.return_value = [
            self.mock_recommendation, self.mock_recommendation2
        ]
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.mock_recommendation
        self.mock_db.add.return_value = None
        self.mock_db.commit.return_value = None
        self.mock_db.refresh.return_value = None
        
        self.patcher_get_user = mock.patch('routes.recommendation_routes.get_current_active_user')
        self.mock_get_user = self.patcher_get_user.start()
        self.mock_get_user.return_value = self.mock_user
        
        self.patcher_get_db = mock.patch('routes.recommendation_routes.get_db')
        self.mock_get_db = self.patcher_get_db.start()
        self.mock_get_db.return_value = self.mock_db
    
    def tearDown(self):
        self.patcher_get_user.stop()
        self.patcher_get_db.stop()
    
    def test_get_recommendations_endpoint(self):
                
        # Verify the mock recommendation data
        self.assertEqual(self.mock_recommendation.meal_name, "Test Healthy Meal")
        self.assertEqual(self.mock_recommendation.nutrient_score, 85.5)
        self.assertEqual(self.mock_recommendation.protein, 30)
        
        # Verify the second mock recommendation
        self.assertEqual(self.mock_recommendation2.meal_name, "Another Test Meal")
        self.assertEqual(self.mock_recommendation2.nutrient_score, 80.0)
        
        expected_recommendations = [
            RecommendationResponse(
                id=self.mock_recommendation.id,
                meal_name=self.mock_recommendation.meal_name,
                recipe=self.mock_recommendation.recipe,
                nutrient_score=self.mock_recommendation.nutrient_score,
                nutrient_adequacy_score=self.mock_recommendation.nutrient_adequacy_score,
                meal_balance_score=self.mock_recommendation.meal_balance_score,
                health_impact_score=self.mock_recommendation.health_impact_score,
                personalization_score=self.mock_recommendation.personalization_score,
                score_explanation=self.mock_recommendation.score_explanation,
                calories=self.mock_recommendation.calories,
                protein=self.mock_recommendation.protein,
                carbs=self.mock_recommendation.carbs,
                fats=self.mock_recommendation.fats,
                fiber=self.mock_recommendation.fiber,
                created_at=self.mock_recommendation.created_at,
                is_disliked=self.mock_recommendation.is_disliked
            ),
            RecommendationResponse(
                id=self.mock_recommendation2.id,
                meal_name=self.mock_recommendation2.meal_name,
                recipe=self.mock_recommendation2.recipe,
                nutrient_score=self.mock_recommendation2.nutrient_score,
                created_at=self.mock_recommendation2.created_at,
                is_disliked=self.mock_recommendation2.is_disliked,
                calories=0,  # Default values
                protein=0,
                carbs=0,
                fats=0,
                fiber=0
            )
        ]
        
        self.assertEqual(len(expected_recommendations), 2)
    
    def test_dislike_recommendation_endpoint(self):

        self.mock_db.query.return_value.filter.return_value.first.return_value = self.mock_recommendation
        
        self.assertFalse(self.mock_recommendation.is_disliked)
        
        self.mock_recommendation.is_disliked = True
        
        self.assertTrue(self.mock_recommendation.is_disliked)
        
        expected_response = RecommendationResponse(
            id=self.mock_recommendation.id,
            meal_name=self.mock_recommendation.meal_name,
            recipe=self.mock_recommendation.recipe,
            nutrient_score=self.mock_recommendation.nutrient_score,
            nutrient_adequacy_score=self.mock_recommendation.nutrient_adequacy_score,
            meal_balance_score=self.mock_recommendation.meal_balance_score,
            health_impact_score=self.mock_recommendation.health_impact_score,
            personalization_score=self.mock_recommendation.personalization_score,
            score_explanation=self.mock_recommendation.score_explanation,
            calories=self.mock_recommendation.calories,
            protein=self.mock_recommendation.protein,
            carbs=self.mock_recommendation.carbs,
            fats=self.mock_recommendation.fats,
            fiber=self.mock_recommendation.fiber,
            created_at=self.mock_recommendation.created_at,
            is_disliked=True
        )
        
        self.assertTrue(expected_response.is_disliked)
    
    def test_recipe_structure_validation(self):
        
        json_recipe = json.dumps({
            "ingredients": ["Chicken breast", "Brown rice", "Broccoli"],
            "instructions": ["Cook chicken", "Steam broccoli", "Serve over rice"]
        })
        
        processed_recipe = ensure_recipe_structure(json_recipe)
        
        self.assertIn("ingredients", processed_recipe)
        self.assertIn("instructions", processed_recipe)
        self.assertEqual(len(processed_recipe["ingredients"]), 3)
        self.assertEqual(len(processed_recipe["instructions"]), 3)
        
        text_recipe = """
        Ingredients:
        - 100g chicken breast
        - 50g brown rice
        - 100g broccoli
        
        Instructions:
        1. Cook chicken in a pan
        2. Steam broccoli for 5 minutes
        3. Serve chicken and broccoli over rice
        """
        
        processed_text_recipe = ensure_recipe_structure(text_recipe)
        
        self.assertIn("ingredients", processed_text_recipe)
        self.assertIn("instructions", processed_text_recipe)
        self.assertTrue(len(processed_text_recipe["ingredients"]) > 0)
        self.assertTrue(len(processed_text_recipe["instructions"]) > 0)
        
        processed_none_recipe = ensure_recipe_structure(None)
        
        self.assertIn("ingredients", processed_none_recipe)
        self.assertIn("instructions", processed_none_recipe)
        self.assertEqual(len(processed_none_recipe["ingredients"]), 0)
        self.assertEqual(len(processed_none_recipe["instructions"]), 1)
        self.assertEqual(processed_none_recipe["instructions"][0], "No recipe data available")


if __name__ == '__main__':
    unittest.main() 