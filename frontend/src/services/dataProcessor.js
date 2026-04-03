import { userApi, healthApi, mealApi, exerciseApi, waterApi } from './api';

class DataProcessor {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; 
  }

  // Get all user data for analysis
  async getUserData() {
    try {
      const [profile, health, meals, exercises, water] = await Promise.allSettled([
        userApi.getProfile(),
        healthApi.getStatus(),
        mealApi.getMealHistory(),
        exerciseApi.getHistory(),
        waterApi.getWaterHistory(30)
      ]);

      // Handle missing or error data
      return {
        profile: profile.status === 'fulfilled' ? profile.value?.data || {} : {},
        health: health.status === 'fulfilled' ? health.value?.data || [] : [],
        meals: meals.status === 'fulfilled' ? meals.value?.data || [] : [],
        exercises: exercises.status === 'fulfilled' ? exercises.value?.data || [] : [],
        water: water.status === 'fulfilled' ? water.value?.data || [] : []
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return {
        profile: {},
        health: [],
        meals: [],
        exercises: [],
        water: []
      };
    }
  }

  calculateWeeklyAverages(data) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      meals: this.averageMealData(data.meals, weekAgo),
      exercises: this.averageExerciseData(data.exercises, weekAgo),
      water: this.averageWaterData(data.water, weekAgo),
      health: this.averageHealthData(data.health, weekAgo)
    };
  }

  calculateMonthlyAverages(data) {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      meals: this.averageMealData(data.meals, monthAgo),
      exercises: this.averageExerciseData(data.exercises, monthAgo),
      water: this.averageWaterData(data.water, monthAgo),
      health: this.averageHealthData(data.health, monthAgo)
    };
  }

  averageMealData(meals, startDate) {
    const filteredMeals = meals.filter(meal => new Date(meal.timestamp) >= startDate);
    if (filteredMeals.length === 0) return null;

    const totals = filteredMeals.reduce((acc, meal) => ({
      calories: (acc.calories || 0) + (meal.calories || 0),
      protein: (acc.protein || 0) + (meal.protein || 0),
      carbs: (acc.carbs || 0) + (meal.carbs || 0),
      fats: (acc.fats || 0) + (meal.fats || 0),
      sugar: (acc.sugar || 0) + (meal.sugar || 0),
      fiber: (acc.fiber || 0) + (meal.fiber || 0)
    }), {});

    const count = filteredMeals.length;
    return {
      calories: Math.round(totals.calories / count),
      protein: Math.round(totals.protein / count),
      carbs: Math.round(totals.carbs / count),
      fats: Math.round(totals.fats / count),
      sugar: Math.round(totals.sugar / count),
      fiber: Math.round(totals.fiber / count)
    };
  }

  averageExerciseData(exercises, startDate) {
    const filteredExercises = exercises.filter(ex => new Date(ex.timestamp) >= startDate);
    if (filteredExercises.length === 0) return null;

    const totals = filteredExercises.reduce((acc, ex) => ({
      duration: (acc.duration || 0) + (ex.duration || 0),
      caloriesBurned: (acc.caloriesBurned || 0) + (ex.caloriesBurned || 0)
    }), {});

    const count = filteredExercises.length;
    return {
      duration: Math.round(totals.duration / count),
      caloriesBurned: Math.round(totals.caloriesBurned / count)
    };
  }

  averageWaterData(water, startDate) {
    const filteredWater = water.filter(w => new Date(w.date) >= startDate);
    if (filteredWater.length === 0) return null;

    const total = filteredWater.reduce((acc, w) => acc + (w.glasses || 0), 0);
    return Math.round(total / filteredWater.length);
  }


  averageHealthData(health, startDate) {
    const healthArray = Array.isArray(health) ? health : [];
    const filteredHealth = healthArray.filter(h => new Date(h.timestamp) >= startDate);
    if (filteredHealth.length === 0) return null;

    const totals = filteredHealth.reduce((acc, h) => ({
      bmi: (acc.bmi || 0) + (h.bmi || 0),
      daily_activity: (acc.daily_activity || 0) + (h.daily_activity || 0),
      protein_intake: (acc.protein_intake || 0) + (h.protein_intake || 0),
      carbs_intake: (acc.carbs_intake || 0) + (h.carbs_intake || 0),
      fat_intake: (acc.fat_intake || 0) + (h.fat_intake || 0),
      water_intake: (acc.water_intake || 0) + (h.water_intake || 0)
    }), {});

    const count = filteredHealth.length;
    return {
      bmi: Math.round((totals.bmi / count) * 10) / 10,
      daily_activity: Math.round(totals.daily_activity / count),
      protein_intake: Math.round(totals.protein_intake / count),
      carbs_intake: Math.round(totals.carbs_intake / count),
      fat_intake: Math.round(totals.fat_intake / count),
      water_intake: Math.round(totals.water_intake / count)
    };
  }

  detectSeasonalPatterns(data) {
    const now = new Date();
    const month = now.getMonth();
    const season = this.getSeason(month);

    return {
      season,
      seasonalFactors: {
        activityLevel: this.calculateSeasonalActivityLevel(data, season),
        dietaryPatterns: this.calculateSeasonalDietaryPatterns(data, season),
        healthTrends: this.calculateSeasonalHealthTrends(data, season)
      }
    };
  }

  getSeason(month) {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  calculateSeasonalHealthTrends(data, season) {
    const healthArray = Array.isArray(data.health) ? data.health : [];
    const seasonalHealth = healthArray.filter(h => {
      const healthDate = new Date(h.timestamp);
      const healthMonth = healthDate.getMonth();
      return this.getSeason(healthMonth) === season;
    });

    if (seasonalHealth.length === 0) return 'stable';

    const bmiTrend = this.calculateBMITrend(seasonalHealth);
    const activityTrend = this.calculateActivityTrend(seasonalHealth);

    if (bmiTrend === 'increasing' && activityTrend === 'decreasing') return 'declining';
    if (bmiTrend === 'decreasing' && activityTrend === 'increasing') return 'improving';
    return 'stable';
  }

  calculateBMITrend(healthData) {
    if (healthData.length < 2) return 'stable';
    
    const bmis = healthData.map(h => h.bmi).filter(bmi => bmi != null);
    if (bmis.length < 2) return 'stable';

    const firstBMI = bmis[0];
    const lastBMI = bmis[bmis.length - 1];
    const diff = lastBMI - firstBMI;

    if (diff > 0.5) return 'increasing';
    if (diff < -0.5) return 'decreasing';
    return 'stable';
  }

  calculateActivityTrend(healthData) {
    if (healthData.length < 2) return 'stable';
    
    const activities = healthData.map(h => h.daily_activity).filter(activity => activity != null);
    if (activities.length < 2) return 'stable';

    const firstActivity = activities[0];
    const lastActivity = activities[activities.length - 1];
    const diff = lastActivity - firstActivity;

    if (diff > 10) return 'increasing';
    if (diff < -10) return 'decreasing';
    return 'stable';
  }

  calculateSeasonalActivityLevel(data, season) {
    const exercises = Array.isArray(data.exercises) ? data.exercises : [];
    const seasonalExercises = exercises.filter(ex => {
      const exDate = new Date(ex.timestamp);
      const exMonth = exDate.getMonth();
      return this.getSeason(exMonth) === season;
    });

    if (seasonalExercises.length === 0) return 'moderate';

    const totalDuration = seasonalExercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
    const avgDuration = totalDuration / seasonalExercises.length;

    if (avgDuration > 60) return 'high';
    if (avgDuration > 30) return 'moderate';
    return 'low';
  }

  calculateSeasonalDietaryPatterns(data, season) {
    const meals = Array.isArray(data.meals) ? data.meals : [];
    const seasonalMeals = meals.filter(meal => {
      const mealDate = new Date(meal.timestamp);
      const mealMonth = mealDate.getMonth();
      return this.getSeason(mealMonth) === season;
    });

    if (seasonalMeals.length === 0) return 'balanced';

    const totalCalories = seasonalMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const avgCalories = totalCalories / seasonalMeals.length;

    if (avgCalories > 2500) return 'high-calorie';
    if (avgCalories > 2000) return 'moderate';
    return 'low-calorie';
  }

  formatDataForAPI(data) {
    const safeData = {
      profile: data.profile || {},
      health: Array.isArray(data.health) ? data.health : [],
      meals: Array.isArray(data.meals) ? data.meals : [],
      exercises: Array.isArray(data.exercises) ? data.exercises : [],
      water: Array.isArray(data.water) ? data.water : []
    };

    return {
      userProfile: {
        age: this.calculateAge(safeData.profile.date_of_birth),
        gender: safeData.profile.gender,
        height: safeData.profile.height,
        weight: safeData.profile.weight,
        activityLevel: safeData.profile.daily_physical_activity,
        medicalHistory: {
          heartDisease: safeData.profile.heart_disease,
          diabetes: safeData.profile.diabetes,
          familyHistory: {
            heartDisease: safeData.profile.family_heart_disease,
            diabetes: safeData.profile.family_diabetes
          }
        },
        lifestyle: {
          smoking: safeData.profile.smoking_status,
          alcohol: safeData.profile.alcohol_consumption
        }
      },
      healthMetrics: {
        current: safeData.health,
        weekly: this.calculateWeeklyAverages(safeData),
        monthly: this.calculateMonthlyAverages(safeData),
        seasonal: this.detectSeasonalPatterns(safeData)
      },
      nutrition: {
        current: safeData.meals,
        averages: this.calculateWeeklyAverages(safeData).meals
      },
      exercise: {
        current: safeData.exercises,
        averages: this.calculateWeeklyAverages(safeData).exercises
      },
      water: {
        current: safeData.water,
        averages: this.calculateWeeklyAverages(safeData).water
      }
    };
  }

  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}

export const dataProcessor = new DataProcessor(); 