import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, date
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load the trained model
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                         "NHANES_Model", "DATA", "random_forest_model.pkl")

# Log absolute path for debugging
logger.info(f"Model path: {os.path.abspath(MODEL_PATH)}")

# Map the numeric predictions to labels
target_map = {0: 'Healthy', 1: 'At Risk', 2: 'Unhealthy'}

# Initialize the classifier variable
health_classifier = None

# Load health model
def load_model():
    global health_classifier
    
    try:
        logger.info(f"Loading model from {MODEL_PATH}")
        health_classifier = joblib.load(MODEL_PATH)
        logger.info("Health classification model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        health_classifier = None
        return False

# Calculate user BMI from weight (kg) and height (cm)
def calculate_bmi(weight_kg, height_cm):
    if not weight_kg or not height_cm or height_cm == 0:
        return None
    height_m = height_cm / 100.0
    return weight_kg / (height_m * height_m)

# Calculate user age from birth date
def calculate_age(birth_date):
    if not birth_date:
        return None
    today = datetime.now()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return age

# Classify health status
def classify_user_health(input_features):
    # Analyzes health data and predicts status (Healthy/At Risk/Unhealthy)
    global health_classifier
    
    # Make sure the model is loaded
    if health_classifier is None:
        load_model()
        if health_classifier is None:
            error_msg = "Health classification model not available"
            logger.error(error_msg)
            raise ValueError(error_msg)
    
    try:
        # The model wants age, BMI_final, DR1TKCAL, DR1TSUGR, PAD680, genetic_risk
        age = input_features[0]
        bmi = input_features[2]  
        
        # Map physical activity minutes to PAD680 scale (approximate)
        daily_activity_min = input_features[3]
        activity_level = 0
        if daily_activity_min >= 60:
            activity_level = 3
        elif daily_activity_min >= 30:
            activity_level = 2
        elif daily_activity_min > 0:
            activity_level = 1
        
        # Using direct measurements if available 
        if len(input_features) > 10 and input_features[10] is not None:
            total_calories = input_features[10] 
        else:
            # Calculate from macronutrients using standard USDA factors if direct measurement not available
            protein_intake = input_features[8]
            carbs_intake = input_features[9]
            protein_calories = protein_intake * 4
            carbs_calories = carbs_intake * 4
            total_calories = (protein_calories + carbs_calories) / 0.7  # Assuming protein+carbs are 70% of diet
        
        if len(input_features) > 11 and input_features[11] is not None:
            sugar = input_features[11]  
        else:
            # Estimate sugar if direct measurement not available
            carbs_intake = input_features[9]
            sugar = carbs_intake * 0.25  # Estimate 25% of carbs as sugar
        
        # Calculate genetic risk (0-3) based on heart disease and diabetes
        has_heart_disease = input_features[4]
        has_diabetes = input_features[5]
        has_smoking = input_features[6]
        has_alcohol = input_features[7]
        
        genetic_risk = 0
        if has_heart_disease:
            genetic_risk += 1
        if has_diabetes:
            genetic_risk += 1
        if has_smoking:
            genetic_risk += 0.5
        if has_alcohol:
            genetic_risk += 0.5
            
        # Create a DataFrame with the features
        model_input = pd.DataFrame([{
            'age': age,
            'BMI_final': bmi,
            'DR1TKCAL': total_calories,  
            'DR1TSUGR': sugar,     
            'PAD680': activity_level,
            'genetic_risk': genetic_risk
        }])
        
        # Make prediction
        prediction = health_classifier.predict(model_input)
        
        confidence = None
        if hasattr(health_classifier, 'predict_proba'):
            probabilities = health_classifier.predict_proba(model_input)
            # Get the probability for the predicted class
            prediction_idx = int(prediction[0])
            confidence = float(probabilities[0][prediction_idx])
        
        # Return both the classification and confidence
        result = {
            'classification': target_map[int(prediction[0])],
            'confidence': confidence
        }
        
        return result
        
    except Exception as e:
        error_msg = f"Error during health classification: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)

# Load the model when the module is imported
load_model() 