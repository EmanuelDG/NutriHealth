import unittest
from sqlalchemy import text
from tests.base import BaseTestCase
from database.models import User, MealLog, HealthStatus, Recommendation, ExerciseLog, WaterTracking, Base
from datetime import datetime, date

# Integration test for database models
class TestModels(BaseTestCase):

    def setUp(self):
        super().setUp()
        Base.metadata.create_all(bind=self.engine)
    
    def tearDown(self):
        Base.metadata.drop_all(bind=self.engine)
        super().tearDown()
    
    def test_user_model_creation(self):
        user = User(
            name="Test User",
            username="testuser",
            email="test@example.com",
            phone_number="1234567890",
            hashed_password="hashed_password",
            gender="Male",
            height=175.0,
            weight=70.0
        )
        
        self.db.add(user)
        self.db.commit()
        
        self.db.refresh(user)
        
        self.assertIsNotNone(user.id)
        
        queried_user = self.db.query(User).filter(User.username == "testuser").first()
        
        self.assertIsNotNone(queried_user)
        self.assertEqual(queried_user.name, "Test User")
        self.assertEqual(queried_user.email, "test@example.com")
        self.assertEqual(queried_user.height, 175.0)
    
    def test_user_relationships(self):
        user = User(
            name="Relationship Test User",
            username="relationuser",
            email="relation@example.com",
            hashed_password="hashed_password"
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        self.assertEqual(len(user.meal_logs), 0)
        
        meal1 = MealLog(
            user_id=user.id,
            name="Breakfast",
            meal_type="breakfast",
            calories=500,
            protein=20.0,
            carbs=60.0,
            fat=15.0
        )
        
        meal2 = MealLog(
            user_id=user.id,
            name="Lunch",
            meal_type="lunch",
            calories=700,
            protein=30.0,
            carbs=80.0,
            fat=25.0
        )
        
        self.db.add(meal1)
        self.db.add(meal2)
        self.db.commit()
        
        self.db.refresh(user)
        
        self.assertEqual(len(user.meal_logs), 2)
        self.assertEqual(user.meal_logs[0].name, "Breakfast")
        self.assertEqual(user.meal_logs[1].name, "Lunch")
    
    def test_meallog_model_creation(self):
        user = User(
            name="Meal Test User",
            username="mealuser",
            email="meal@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        meal = MealLog(
            user_id=user.id,
            name="Dinner",
            description="Grilled chicken with vegetables",
            meal_type="dinner",
            calories=600,
            protein=40.0,
            carbs=50.0,
            fat=15.0,
            fiber=8.0,
            sugar=5.0
        )
        self.db.add(meal)
        self.db.commit()
        
        self.db.refresh(meal)
        
        self.assertIsNotNone(meal.id)
        
        queried_meal = self.db.query(MealLog).filter(MealLog.name == "Dinner").first()
        
        self.assertIsNotNone(queried_meal)
        self.assertEqual(queried_meal.description, "Grilled chicken with vegetables")
        self.assertEqual(queried_meal.meal_type, "dinner")
        self.assertEqual(queried_meal.calories, 600)
        self.assertEqual(queried_meal.protein, 40.0)
    
    def test_meallog_relationships(self):
        user = User(
            name="Meal Relation User",
            username="mealrelation",
            email="mealrelation@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        meal = MealLog(
            user_id=user.id,
            name="Snack",
            meal_type="snack",
            calories=200
        )
        self.db.add(meal)
        self.db.commit()
        self.db.refresh(meal)
        
        self.assertIsNotNone(meal.user)
        self.assertEqual(meal.user.id, user.id)
        self.assertEqual(meal.user.username, "mealrelation")
    
    def test_healthstatus_model_creation(self):
        user = User(
            name="Health Test User",
            username="healthuser",
            email="health@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        health_status = HealthStatus(
            user_id=user.id,
            classification="Healthy",
            bmi=22.5,
            cholesterol=180.0,
            blood_sugar=95.0,
            risk_factors='["sedentary lifestyle"]',
            improvement_areas='["increase activity", "reduce sugar"]'
        )
        
        self.db.add(health_status)
        self.db.commit()
        
        self.db.refresh(health_status)
        
        self.assertIsNotNone(health_status.id)
        
        queried_health = self.db.query(HealthStatus).filter(HealthStatus.user_id == user.id).first()
        
        self.assertIsNotNone(queried_health)
        self.assertEqual(queried_health.classification, "Healthy")
        self.assertEqual(queried_health.bmi, 22.5)
        self.assertEqual(queried_health.cholesterol, 180.0)
    
    def test_healthstatus_relationships(self):
        user = User(
            name="Health Relation User",
            username="healthrelation",
            email="healthrelation@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        health_status = HealthStatus(
            user_id=user.id,
            classification="At Risk",
            bmi=26.0
        )
        self.db.add(health_status)
        self.db.commit()
        self.db.refresh(health_status)
        
        self.assertIsNotNone(health_status.user)
        self.assertEqual(health_status.user.id, user.id)
        self.assertEqual(health_status.user.username, "healthrelation")
        
        self.db.refresh(user)
        self.assertEqual(len(user.health_status), 1)
        self.assertEqual(user.health_status[0].classification, "At Risk")
    
    def test_recommendation_model_creation(self):
        user = User(
            name="Recommendation Test User",
            username="recuser",
            email="rec@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        recommendation = Recommendation(
            user_id=user.id,
            meal_name="Mediterranean Salad",
            recipe="A delicious Mediterranean salad with olives, feta, and tomatoes",
            nutrient_score=8.5,
            nutrient_adequacy_score=8.0,
            meal_balance_score=9.0,
            health_impact_score=8.5,
            personalization_score=8.0,
            score_explanation="High in fiber and protein, low in saturated fat",
            calories=400,
            protein=15.0,
            carbs=30.0,
            fats=20.0,
            fiber=8.0,
            is_disliked=False
        )
        
        self.db.add(recommendation)
        self.db.commit()
        
        self.db.refresh(recommendation)
        
        self.assertIsNotNone(recommendation.id)
        
        queried_rec = self.db.query(Recommendation).filter(Recommendation.meal_name == "Mediterranean Salad").first()
        
        self.assertIsNotNone(queried_rec)
        self.assertEqual(queried_rec.nutrient_score, 8.5)
        self.assertEqual(queried_rec.calories, 400)
        self.assertEqual(queried_rec.protein, 15.0)
    
    def test_recommendation_relationships(self):
        # Create a user
        user = User(
            name="Rec Relation User",
            username="recrelation",
            email="recrelation@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Create recommendations
        rec1 = Recommendation(
            user_id=user.id,
            meal_name="Oatmeal Breakfast",
            recipe="Healthy oatmeal with fruits",
            calories=300
        )
        
        rec2 = Recommendation(
            user_id=user.id,
            meal_name="Green Smoothie",
            recipe="Kale, spinach, banana smoothie",
            calories=200
        )
        
        self.db.add(rec1)
        self.db.add(rec2)
        self.db.commit()
        
        # Test relationship from recommendation to user
        self.db.refresh(rec1)
        self.assertIsNotNone(rec1.user)
        self.assertEqual(rec1.user.id, user.id)
        
        # Test relationship from user to recommendations
        self.db.refresh(user)
        self.assertEqual(len(user.recommendations), 2)
        self.assertEqual(user.recommendations[0].meal_name, "Oatmeal Breakfast")
        self.assertEqual(user.recommendations[1].meal_name, "Green Smoothie")
    
    def test_exerciselog_model_creation(self):
        user = User(
            name="Exercise Test User",
            username="exerciseuser",
            email="exercise@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        exercise = ExerciseLog(
            user_id=user.id,
            activity_type="running",
            duration=30,
            calories_burned=250
        )
        
        self.db.add(exercise)
        self.db.commit()
        
        self.db.refresh(exercise)
        
        self.assertIsNotNone(exercise.id)
        
        queried_exercise = self.db.query(ExerciseLog).filter(
            ExerciseLog.user_id == user.id,
            ExerciseLog.activity_type == "running"
        ).first()
        
        self.assertIsNotNone(queried_exercise)
        self.assertEqual(queried_exercise.duration, 30)
        self.assertEqual(queried_exercise.calories_burned, 250)
    
    def test_exerciselog_relationships(self):
        user = User(
            name="Exercise Relation User",
            username="exrelation",
            email="exrelation@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        ex1 = ExerciseLog(
            user_id=user.id,
            activity_type="walking",
            duration=45,
            calories_burned=180
        )
        
        ex2 = ExerciseLog(
            user_id=user.id,
            activity_type="cycling",
            duration=60,
            calories_burned=350
        )
        
        self.db.add(ex1)
        self.db.add(ex2)
        self.db.commit()
        
        self.db.refresh(ex1)
        self.assertIsNotNone(ex1.user)
        self.assertEqual(ex1.user.id, user.id)
        
        self.db.refresh(user)
        self.assertEqual(len(user.exercise_logs), 2)
        activities = [log.activity_type for log in user.exercise_logs]
        self.assertIn("walking", activities)
        self.assertIn("cycling", activities)
    
    def test_watertracking_model_creation(self):
        user = User(
            name="Water Test User",
            username="wateruser",
            email="water@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        water_tracking = WaterTracking(
            user_id=user.id,
            date=date.today(),
            glasses=6
        )
        
        self.db.add(water_tracking)
        self.db.commit()
        
        self.db.refresh(water_tracking)
        
        self.assertIsNotNone(water_tracking.id)
        
        queried_water = self.db.query(WaterTracking).filter(
            WaterTracking.user_id == user.id,
            WaterTracking.date == date.today()
        ).first()
        
        self.assertIsNotNone(queried_water)
        self.assertEqual(queried_water.glasses, 6)
    
    def test_watertracking_relationships(self):
        user = User(
            name="Water Relation User",
            username="waterrelation",
            email="waterrelation@example.com",
            hashed_password="hashed_password"
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        water1 = WaterTracking(
            user_id=user.id,
            date=date(2023, 5, 1),
            glasses=5
        )
        
        water2 = WaterTracking(
            user_id=user.id,
            date=date(2023, 5, 2),
            glasses=8
        )
        
        self.db.add(water1)
        self.db.add(water2)
        self.db.commit()
        
        self.db.refresh(water1)
        self.assertIsNotNone(water1.user)
        self.assertEqual(water1.user.id, user.id)
        
        self.db.refresh(user)
        self.assertEqual(len(user.water_tracking), 2)
        
        glasses = [entry.glasses for entry in user.water_tracking]
        self.assertIn(5, glasses)
        self.assertIn(8, glasses)

if __name__ == '__main__':
    unittest.main() 