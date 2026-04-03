import unittest
from unittest import mock
import sys
import os
from datetime import datetime, date
import pandas as pd
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml import model_loader

class TestModelLoader(unittest.TestCase):
    
    def setUp(self):
        self.patcher_joblib = mock.patch('ml.model_loader.joblib.load')
        self.mock_joblib_load = self.patcher_joblib.start()
        
        self.mock_classifier = mock.MagicMock()
        self.mock_classifier.predict.return_value = [0]  # 0 = Healthy
        self.mock_joblib_load.return_value = self.mock_classifier
        
        self.original_classifier = model_loader.health_classifier
    
    def tearDown(self):
        self.patcher_joblib.stop()
        model_loader.health_classifier = self.original_classifier
    
    def test_model_loading_functionality(self):
        model_loader.health_classifier = None
        
        result = model_loader.load_model()
        
        self.mock_joblib_load.assert_called_once_with(model_loader.MODEL_PATH)
        
        self.assertTrue(result)
        self.assertIsNotNone(model_loader.health_classifier)
        self.assertEqual(model_loader.health_classifier, self.mock_classifier)
    
    def test_health_classification_function(self):
        model_loader.health_classifier = self.mock_classifier
        
        input_features = [40, 1, 25.0, 30, 0, 0, 0, 0, 100, 200]
        
        result = model_loader.classify_user_health(input_features)
        
        self.assertTrue(self.mock_classifier.predict.called)
        
        self.assertEqual(result, "Healthy")
        
        self.mock_classifier.predict.return_value = [1]  # 1 = At Risk
        result = model_loader.classify_user_health(input_features)
        self.assertEqual(result, "At Risk")
        
        self.mock_classifier.predict.return_value = [2]  # 2 = Unhealthy
        result = model_loader.classify_user_health(input_features)
        self.assertEqual(result, "Unhealthy")
    
    def test_bmi_calculation_function(self):
        weight_kg = 70.0
        height_cm = 175.0
        expected_bmi = weight_kg / ((height_cm / 100.0) ** 2)
        calculated_bmi = model_loader.calculate_bmi(weight_kg, height_cm)
        self.assertAlmostEqual(calculated_bmi, expected_bmi, places=4)
        
        weight_kg = 120.0
        height_cm = 200.0
        expected_bmi = weight_kg / ((height_cm / 100.0) ** 2)
        calculated_bmi = model_loader.calculate_bmi(weight_kg, height_cm)
        self.assertAlmostEqual(calculated_bmi, expected_bmi, places=4)
        
        weight_kg = 0
        height_cm = 0
        calculated_bmi = model_loader.calculate_bmi(weight_kg, height_cm)
        self.assertIsNone(calculated_bmi)
        
        calculated_bmi = model_loader.calculate_bmi(None, None)
        self.assertIsNone(calculated_bmi)
    
    def test_age_calculation_function(self):
        birth_date = date(1990, 6, 15)
        expected_age = datetime.now().year - birth_date.year
        
        if (datetime.now().month, datetime.now().day) < (birth_date.month, birth_date.day):
            expected_age -= 1
            
        calculated_age = model_loader.calculate_age(birth_date)
        self.assertEqual(calculated_age, expected_age)
        
        birth_date = date(1950, 1, 1)
        expected_age = datetime.now().year - birth_date.year
        calculated_age = model_loader.calculate_age(birth_date)
        self.assertEqual(calculated_age, expected_age)
        
        calculated_age = model_loader.calculate_age(None)
        self.assertIsNone(calculated_age)


if __name__ == '__main__':
    unittest.main() 