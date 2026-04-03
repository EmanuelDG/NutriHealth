from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Table, Text, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    # User ID 
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    
    # Health metrics
    gender = Column(String, nullable=True)
    height = Column(Float, nullable=True)  # in cm
    weight = Column(Float, nullable=True)  # in kg
    date_of_birth = Column(DateTime, nullable=True)
    daily_physical_activity = Column(Float, nullable=True)  # minutes
    daily_physical_activity_goal = Column(Float, nullable=True)  # minutes
    
    # Medical conditions
    heart_disease = Column(Boolean, default=False)
    diabetes = Column(Boolean, default=False)
    family_history = Column(Text, nullable=True)
    
    # Lifestyle
    smoking = Column(Boolean, default=False)
    alcohol = Column(Boolean, default=False)
    
    # Dietary
    restrictions = Column(Text, nullable=True)  # JSON string of dietary restrictions
    allergies = Column(Text, nullable=True)  # JSON string of food allergies
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    meal_logs = relationship("MealLog", back_populates="user")
    health_status = relationship("HealthStatus", back_populates="user")
    recommendations = relationship("Recommendation", back_populates="user")
    exercise_logs = relationship("ExerciseLog", back_populates="user")
    water_tracking = relationship("WaterTracking", back_populates="user")
    # The family_health_history relationship is defined as a backref in the FamilyHistory model

class MealLog(Base):
    __tablename__ = "meal_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    meal_type = Column(String, nullable=False)  # breakfast, lunch, dinner, snack
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Nutritional information
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)  # in grams
    carbs = Column(Float, nullable=True)    # in grams
    fat = Column(Float, nullable=True)      # in grams
    fiber = Column(Float, nullable=True)    # in grams
    sugar = Column(Float, nullable=True)    # in grams
    
    # Relationships
    user = relationship("User", back_populates="meal_logs")

class HealthStatus(Base):
    __tablename__ = "health_status"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Overall classification
    classification = Column(String, nullable=False)  # e.g. "Normal", "At Risk", "High Risk"
    
    # Specific metrics
    bmi = Column(Float, nullable=True)
    cholesterol = Column(Float, nullable=True)
    blood_sugar = Column(Float, nullable=True)
    
    # Analysis
    risk_factors = Column(Text, nullable=True)  # JSON string of identified risk factors
    improvement_areas = Column(Text, nullable=True)  # JSON string of improvement areas
    
    # Relationships
    user = relationship("User", back_populates="health_status")

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    meal_name = Column(String, nullable=False)
    recipe = Column(Text, nullable=False)
    nutrient_score = Column(Float, nullable=True)
    
    # Detailed scoring breakdown
    nutrient_adequacy_score = Column(Float, nullable=True)
    meal_balance_score = Column(Float, nullable=True)
    health_impact_score = Column(Float, nullable=True)
    personalization_score = Column(Float, nullable=True)
    score_explanation = Column(Text, nullable=True)
    
    # Adding fields for calories and macronutrients
    calories = Column(Float, nullable=True, default=0)
    protein = Column(Float, nullable=True, default=0)
    carbs = Column(Float, nullable=True, default=0)
    fats = Column(Float, nullable=True, default=0)
    fiber = Column(Float, nullable=True, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_disliked = Column(Boolean, default=False)
    

    user = relationship("User", back_populates="recommendations")

class ExerciseLog(Base):
    __tablename__ = "exercise_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String, nullable=True)
    duration = Column(Integer, nullable=False)  # minutes
    calories_burned = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="exercise_logs")

class WaterTracking(Base):
    __tablename__ = "water_tracking"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=func.current_date())
    glasses = Column(Integer, default=0)
    
    user = relationship("User", back_populates="water_tracking")

class FamilyHistory(Base):
    __tablename__ = "family_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Medical conditions in family
    heart_disease = Column(Boolean, default=False)
    diabetes = Column(Boolean, default=False)
    cancer = Column(Boolean, default=False)
    hypertension = Column(Boolean, default=False)
    stroke = Column(Boolean, default=False)
    other = Column(Text, nullable=True)
    
    # Store relationship 
    relation_type = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", backref="family_health_history")

class FutureHealthInsight(Base):
    __tablename__ = "future_health_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Store the complete JSON response
    insight_data = Column(Text, nullable=False)  
    
    # Key fields for querying
    prediction_date = Column(DateTime(timezone=True), server_default=func.now())
    last_generated = Column(DateTime(timezone=True), server_default=func.now())
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", backref="future_health_insights")

class NutrientTarget(Base):
    __tablename__ = "nutrient_targets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Daily nutrient targets
    calories = Column(Float, nullable=False, default=2100)
    protein = Column(Float, nullable=False, default=90)
    carbs = Column(Float, nullable=False, default=250)
    fats = Column(Float, nullable=False, default=70)
    sugar = Column(Float, nullable=False, default=30)
    fiber = Column(Float, nullable=False, default=25)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", backref="nutrient_targets") 