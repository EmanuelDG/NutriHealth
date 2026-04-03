import unittest
import sys
import os
from datetime import datetime, date

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils import data_processing

class TestDataProcessing(unittest.TestCase):
    
    def test_data_transformation_functions(self):
        # Test date transformation
        test_data = {
            "name": "Test User",
            "created_at": datetime(2023, 1, 1, 12, 0, 0),
            "birth_date": date(1990, 5, 15),
            "measurements": [
                {"date": date(2023, 1, 1), "value": 180},
                {"date": date(2023, 1, 2), "value": 182}
            ],
            "metadata": {
                "last_updated": datetime(2023, 1, 2, 14, 30, 0)
            }
        }
        
        transformed_data = data_processing.transform_dates_to_string(test_data)
        
        self.assertEqual(transformed_data["created_at"], "2023-01-01T12:00:00")
        self.assertEqual(transformed_data["birth_date"], "1990-05-15")
        
        self.assertEqual(transformed_data["measurements"][0]["date"], "2023-01-01")
        self.assertEqual(transformed_data["metadata"]["last_updated"], "2023-01-02T14:30:00")
        
        self.assertEqual(transformed_data["name"], "Test User")
        self.assertEqual(transformed_data["measurements"][0]["value"], 180)
        
        camel_case_data = {
            "userName": "test_user",
            "dateOfBirth": "1990-05-15",
            "healthMetrics": {
                "bloodPressure": {
                    "systolicValue": 120,
                    "diastolicValue": 80
                }
            },
            "exerciseLogs": [
                {"activityType": "Running", "durationInMinutes": 30},
                {"activityType": "Cycling", "durationInMinutes": 45}
            ]
        }
        
        transformed_data = data_processing.transform_keys_to_snake_case(camel_case_data)
        
        self.assertIn("user_name", transformed_data)
        self.assertIn("date_of_birth", transformed_data)
        self.assertIn("health_metrics", transformed_data)
        
        self.assertIn("blood_pressure", transformed_data["health_metrics"])
        self.assertIn("systolic_value", transformed_data["health_metrics"]["blood_pressure"])
        self.assertIn("diastolic_value", transformed_data["health_metrics"]["blood_pressure"])
        
        self.assertIn("activity_type", transformed_data["exercise_logs"][0])
        self.assertIn("duration_in_minutes", transformed_data["exercise_logs"][0])
        
        self.assertEqual(transformed_data["user_name"], "test_user")
        self.assertEqual(transformed_data["health_metrics"]["blood_pressure"]["systolic_value"], 120)
    
    def test_validation_functions(self):
        # Test required fields validation
        test_data = {
            "username": "test_user",
            "email": "test@example.com",
            "age": 30,
            "height": None
        }
        
        required_fields = ["username", "email"]
        errors = data_processing.validate_required_fields(test_data, required_fields)
        
        self.assertEqual(len(errors), 0)
        
        required_fields = ["username", "email", "weight"]
        errors = data_processing.validate_required_fields(test_data, required_fields)
        
        self.assertEqual(len(errors), 1)
        self.assertIn("weight", errors[0])
        
        required_fields = ["username", "email", "height"]
        errors = data_processing.validate_required_fields(test_data, required_fields)
        
        self.assertEqual(len(errors), 1)
        self.assertIn("height", errors[0])
        
        test_data = {
            "age": 30,
            "height": 175.5,
            "weight": 70.2,
            "bmi": "invalid",
            "heart_rate": -5
        }
        
        numeric_fields = ["age", "height", "weight", "bmi", "heart_rate"]
        min_values = {"age": 0, "height": 50, "weight": 30, "heart_rate": 0}
        max_values = {"age": 120, "height": 250, "weight": 500}
        
        errors = data_processing.validate_numeric_fields(
            test_data, numeric_fields, min_values, max_values
        )
        
        self.assertEqual(len(errors), 2)
        
        type_error = next((e for e in errors if "bmi" in e and "numeric" in e), None)
        self.assertIsNotNone(type_error)
        
        min_value_error = next((e for e in errors if "heart_rate" in e and "minimum" in e), None)
        self.assertIsNotNone(min_value_error)
        
        valid_data = {
            "age": 30,
            "height": 175.5,
            "weight": 70.2
        }
        
        errors = data_processing.validate_numeric_fields(
            valid_data, numeric_fields, min_values, max_values
        )
        
        self.assertEqual(len(errors), 0)


if __name__ == '__main__':
    unittest.main() 