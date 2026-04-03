import apiClient from './axiosConfig';
import { dataProcessor } from './dataProcessor';


export const calculateNutritionalTargets = (userData, bmiData = null) => {
  // Default values based on USDA guidelines in case calculation fails
  const defaults = {
    calorieTarget: 2100,
    protein: 90,
    carbs: 250,
    fats: 70,
    sugar: 30,
    fiber: 25
  };
  
  try {

    if (!userData || Object.keys(userData).length === 0) {
      console.warn('No user data provided for target calculation, using defaults');
      return defaults;
    }
    
    // Calculate age from date of birth
    let age = 30; // Default
    if (userData.date_of_birth) {
      try {
        const birthDate = new Date(userData.date_of_birth);
        if (!isNaN(birthDate.getTime())) { // Check if date is valid
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDifference = today.getMonth() - birthDate.getMonth();
          if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        } else {
          console.warn('Invalid date of birth format, using default age');
        }
      } catch (dateError) {
        console.warn('Error calculating age from date of birth:', dateError);
      }
    }
    

    const genderValue = typeof userData.gender === 'string' ? 
      parseInt(userData.gender, 10) : userData.gender;
    const isMale = genderValue === 1;

    const height = typeof userData.height === 'string' ? 
      parseFloat(userData.height) || 170 : (userData.height || 170); // cm
    const weight = typeof userData.weight === 'string' ? 
      parseFloat(userData.weight) || 70 : (userData.weight || 70); // kg

    const activityLevelValue = typeof userData.daily_physical_activity === 'string' ? 
      parseInt(userData.daily_physical_activity, 10) : userData.daily_physical_activity;
    const activityLevel = activityLevelValue || 2; // Default to lightly active
    
    // Activity multipliers
    const activityMultipliers = {
      1: 1.2,  // Sedentary
      2: 1.375, // Lightly active
      3: 1.55,  // Moderately active
      4: 1.725, // Very active
      5: 1.9    // Extremely active
    };
    
    // Check if BMI data exists to adjust calculations
    let currentBmi = null;
    
    if (bmiData) {
      currentBmi = typeof bmiData === 'object' ? bmiData.bmi : bmiData;
    } 
    else if (height && weight) {
      const heightInMeters = height / 100;
      currentBmi = weight / (heightInMeters * heightInMeters);
    }
    
    // Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
    let bmr;
    if (isMale) {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Calculate activity multiplier based on activity level
    const activityMultiplier = activityMultipliers[activityLevel] || activityMultipliers[2];
    
    // Calculate Total Daily Energy Expenditure (TDEE)
    const maintenanceTdee = Math.round(bmr * activityMultiplier);
    
    // Apply evidence-based adjustments for weight management based on BMI category 
    let calorieTarget = maintenanceTdee;
    let proteinRatio = 0.25; // Default 25% of calories
    let carbRatio = 0.45;    // Default 45% of calories
    let fatRatio = 0.30;     // Default 30% of calories
    
    if (currentBmi) {
      console.log(`Calculating nutrition targets for BMI: ${currentBmi.toFixed(1)}`);
      
      // Set calorie targets based on BMI category
      if (currentBmi < 18.5) {
        // Underweight - 15% surplus for weight gain (per ASPEN and Academy of Nutrition guidelines)
        calorieTarget = Math.round(maintenanceTdee * 1.15);
        // Higher carbs and moderate protein for weight gain
        proteinRatio = 0.20; 
        carbRatio = 0.55;
        fatRatio = 0.25;
        console.log(`Underweight BMI (${currentBmi.toFixed(1)}): 15% calorie surplus for weight gain`);
      } else if (currentBmi >= 25 && currentBmi < 30) {
        // Overweight - moderate deficit of 500 calories from TDEE
        calorieTarget = Math.max(1500, maintenanceTdee - 500);
        // Higher protein for satiety and muscle preservation
        proteinRatio = 0.30;
        carbRatio = 0.40;
        fatRatio = 0.30;
        console.log(`Overweight BMI (${currentBmi.toFixed(1)}): 500 calorie deficit from TDEE ${maintenanceTdee}`);
      } else if (currentBmi >= 30 && currentBmi < 35) {
        // Class I Obesity - deficit of 750 calories
        calorieTarget = Math.max(1500, maintenanceTdee - 750);
        // Higher protein for satiety and muscle preservation
        proteinRatio = 0.30;
        carbRatio = 0.35;
        fatRatio = 0.35;
        console.log(`Class I Obesity BMI (${currentBmi.toFixed(1)}): 750 calorie deficit from TDEE ${maintenanceTdee}`);
      } else if (currentBmi >= 35) {
        // Class II+ Obesity - deficit of 1000 calories
        calorieTarget = Math.max(isMale ? 1800 : 1500, maintenanceTdee - 1000);
        // Higher protein for satiety and muscle preservation, lower carbs
        proteinRatio = 0.35;
        carbRatio = 0.30;
        fatRatio = 0.35;
        console.log(`Class II+ Obesity BMI (${currentBmi.toFixed(1)}): 1000 calorie deficit from TDEE ${maintenanceTdee}`);
      } else {
        // Normal weight - maintenance calories
        console.log(`Normal BMI (${currentBmi.toFixed(1)}): Maintenance calories at TDEE ${maintenanceTdee}`);
      }
      
      // Ensure calorie floor based on gender
      if (isMale && calorieTarget < 1800) {
        console.log(`Applying calorie floor of 1800 for males (was ${calorieTarget})`);
        calorieTarget = 1800;
      } else if (!isMale && calorieTarget < 1500) {
        console.log(`Applying calorie floor of 1500 for females (was ${calorieTarget})`);
        calorieTarget = 1500;
      }
      
      console.log(`Using BMI-adjusted macronutrient ratios: Protein ${proteinRatio}, Carbs ${carbRatio}, Fats ${fatRatio}`);
      console.log(`Final calorie target: ${calorieTarget} (${isMale ? 'male' : 'female'}, BMI: ${currentBmi.toFixed(1)})`);
    }
    
    // Protein target in grams - based on chosen ratio but also ensuring minimum of 1.2g/kg of bodyweight
    const proteinFromRatio = Math.round((calorieTarget * proteinRatio) / 4);
    const minProteinByWeight = Math.round(weight * 1.2);
    const protein = Math.max(proteinFromRatio, minProteinByWeight);
    
    // Adjust remaining calories after protein
    const proteinCalories = protein * 4;
    const remainingCalories = calorieTarget - proteinCalories;
    
    // Redistribute remaining calories according to carb:fat ratio
    const adjustedCarbFatTotal = carbRatio + fatRatio;
    const adjustedCarbRatio = carbRatio / adjustedCarbFatTotal;
    const adjustedFatRatio = fatRatio / adjustedCarbFatTotal;
    
    // Calculate carbs and fats
    const carbs = Math.round((remainingCalories * adjustedCarbRatio) / 4);
    const fats = Math.round((remainingCalories * adjustedFatRatio) / 9);
    
    // Calculate sugar (10% of calories) and fiber (14g per 1000 calories) per WHO guidelines
    const sugar = Math.round((calorieTarget * 0.10) / 4);
    const fiber = Math.round((calorieTarget / 1000) * 14);
    
    console.log(`Calculated targets - Calories: ${calorieTarget}, Protein: ${protein}g, Carbs: ${carbs}g, Fats: ${fats}g, Sugar: ${sugar}g, Fiber: ${fiber}g`);
    
    return {
      calorieTarget,
      protein,
      carbs,
      fats,
      sugar,
      fiber,
      bmi: currentBmi
    };
  } catch (error) {
    console.error('Error calculating nutritional targets:', error);
    return defaults;
  }
};

export const syncNutritionalTargets = async (bmiData = null) => {
  console.log("Synchronizing nutritional targets across app components");

  try {
    const userResponse = await userApi.getProfile({forceRefresh: true});
    const userData = userResponse?.data || {};
    
    const calculatedTargets = calculateNutritionalTargets(userData, bmiData);
    console.log("Calculated unified targets:", calculatedTargets);
    
    localStorage.setItem('unified_nutrient_targets', JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      targets: calculatedTargets,
      lastUpdated: new Date().toISOString()
    }));
    
    try {
      await nutrientApi.updateNutrientTargets({
        calories: calculatedTargets.calorieTarget,
        protein: calculatedTargets.protein,
        carbs: calculatedTargets.carbs,
        fats: calculatedTargets.fats,
        sugar: calculatedTargets.sugar,
        fiber: calculatedTargets.fiber
      });
      console.log("Successfully saved unified targets to API");
    } catch (apiError) {
      console.error("Error saving targets to API, but local synchronization succeeded:", apiError);
    }
    
    return calculatedTargets;
  } catch (error) {
    console.error("Error synchronizing nutritional targets:", error);
    throw error;
  }
};


export const getUnifiedNutrientTargets = () => {
  try {
    const storedTargets = localStorage.getItem('unified_nutrient_targets');
    if (!storedTargets) return null;
    
    const parsedTargets = JSON.parse(storedTargets);
    

    const today = new Date().toISOString().split('T')[0];
    if (parsedTargets.date !== today) {
      console.log("Stored targets are not from today, consider refreshing");
    }
    
    return parsedTargets.targets;
  } catch (error) {
    console.error("Error retrieving unified targets:", error);
    return null;
  }
};


export const authApi = {

  login: (credentials) => {
    const params = new URLSearchParams();
    params.append('username', credentials.username || '');
    params.append('password', credentials.password || '');
    params.append('grant_type', 'password');
    
    return apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },
  register: (userData) => apiClient.post('/auth/signup', userData),
  signup: (userData) => apiClient.post('/auth/signup', userData),
  verifyEmail: (token) => apiClient.post(`/auth/verify/${token}`),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => 
    apiClient.post(`/auth/reset-password/${token}`, { new_password: newPassword }),
  refreshToken: () => apiClient.post('/auth/refresh')
};


export const userApi = {
  _userCache: {
    profile: null,
    timestamp: null,
    MAX_AGE: 5 * 60 * 1000 
  },
  
  clearCache: () => {
    userApi._userCache.profile = null;
    userApi._userCache.timestamp = null;
  },
  
  validateToken: (token) => {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'Token is missing or not a string' };
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Token is not in valid JWT format' };
    }
    
    try {
      const payload = JSON.parse(atob(parts[1]));
      
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          return { valid: false, reason: 'Token is expired', expired: true, payload };
        }
      }
      
      return { valid: true, payload };
    } catch (e) {
      return { valid: false, reason: 'Token payload is invalid: ' + e.message };
    }
  },
  
  forceProfileRefresh: async () => {
    console.log('Forcing complete profile refresh');
    userApi.clearCache();
    
    try {
      const response = await apiClient.get('/users/profile', {
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        params: {
          t: Date.now() 
        }
      });
      
      console.log('Force refresh result:', response.data);
      return response;
    } catch (error) {
      console.error('Force profile refresh failed:', error);
      throw error;
    }
  },
  
  getProfile: (options = {}) => {
    const isProfilePage = window.location.pathname.includes('/profile');
    const forceRefresh = options.forceRefresh || isProfilePage;
    
    if (isProfilePage) {
      console.log('On profile page - forcing fresh profile data fetch');
      userApi.clearCache(); 
    }
    
    const now = Date.now();
    if (!forceRefresh && 
        userApi._userCache.profile && 
        userApi._userCache.timestamp && 
        (now - userApi._userCache.timestamp < userApi._userCache.MAX_AGE)) {
      console.log('Using cached user profile data');
      return Promise.resolve({ data: userApi._userCache.profile });
    }
    
    console.log(forceRefresh ? 'Forcing fresh profile data fetch' : 'Cache expired, fetching fresh profile data');
    
    const mainToken = localStorage.getItem('token');
    const altToken = localStorage.getItem('access_token');
    const sessionToken = sessionStorage.getItem('token');
    const sessionAltToken = sessionStorage.getItem('access_token');
    
    const token = mainToken || altToken || sessionToken || sessionAltToken;
    const tokenCheck = userApi.validateToken(token);
    const hasValidToken = tokenCheck.valid;
    
    console.log('Token validation in getProfile:', tokenCheck);
    
    const isProfileEditPage = isProfilePage && window.location.search.includes('mode=edit');
    
    if (!hasValidToken && isProfileEditPage) {
      console.log('No valid token found on profile edit page - returning empty profile');
      
      const emptyProfile = {
        username: '',
        email: '',
        name: '',
      };
      
      userApi._userCache.profile = emptyProfile;
      userApi._userCache.timestamp = now;
      
      return Promise.resolve({ data: emptyProfile });
    }
    
    if (tokenCheck.expired) {
      console.error('Token is expired - clearing token and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('access_token');
      
      if (!isProfileEditPage) {
        setTimeout(() => {
          window.location.href = '/login?expired=true';
        }, 500);
        
        return Promise.reject({ message: 'Token expired', status: 401 });
      } else {
        const emptyProfile = { username: '', email: '', name: '' };
        userApi._userCache.profile = emptyProfile;
        userApi._userCache.timestamp = now;
        return Promise.resolve({ data: emptyProfile });
      }
    }
    
    return apiClient.get('/users/profile')
      .then(response => {
        console.log('Profile data received from API:', response.data);
        
        userApi._userCache.profile = response.data;
        userApi._userCache.timestamp = now;
        return response;
      })
      .catch(error => {
        console.error('Error fetching profile data:', error);
        if (error.response) {
          console.error('Response error data:', error.response.data);
          console.error('Response status:', error.response.status);
        } else if (error.request) {
          console.error('No response received:', error.request);
        }
        throw error;
      });
  },
  getPreferences: () => apiClient.get('/users/preferences'),
  
  updateProfile: (profileData) => {
    userApi.clearCache();
    return apiClient.post('/users/profile', profileData);
  },
  updatePassword: (passwordData) => apiClient.post('/users/password', passwordData),
  updatePreferences: (preferences) => apiClient.post('/users/preferences', preferences),
  deleteAccount: () => apiClient.delete('/users/me'),
  updateNutrientTargets: () => nutrientApi.getNutrientTargets(),
  
  getBmiHistory: async () => {
    try {
      const userResponse = await userApi.getProfile();
      const userData = userResponse?.data || {};
      
      if (!userData.height || !userData.weight) {
        console.warn('Cannot calculate BMI: missing height or weight in profile');
        throw new Error('Missing height or weight data');
      }
      
      const heightInMeters = userData.height / 100;
      const currentBmi = userData.weight / (heightInMeters * heightInMeters);
      
      const data = [{
        date: new Date().toISOString().split('T')[0],
        bmi: parseFloat(currentBmi.toFixed(1))
      }];
      
      console.log('Returning current BMI value:', data);
      return { data };
    } catch (error) {
      console.error('Error calculating BMI:', error);
      throw error;
    }
  },
  

  hasCompleteProfile: async () => {
    try {
      const response = await apiClient.get('/users/profile');
      
      const profileData = response.data;
      const hasRequiredData = profileData && (
        profileData.height || 
        profileData.weight || 
        profileData.gender || 
        (profileData.date_of_birth && profileData.date_of_birth !== "null")
      );
      
      console.log('Profile completeness check:', { hasRequiredData, profileData });
      
      if (hasRequiredData && profileData.username) {
        const userKey = `user_${profileData.username}_profile_completed`;
        localStorage.setItem(userKey, 'true');
      }
      
      return { isComplete: hasRequiredData, data: profileData };
    } catch (error) {
      console.error('Error checking profile completeness:', error);
      return { isComplete: false, error };
    }
  },
};


export const mealApi = {

  getRecentMeals: (limit = 5) => apiClient.get(`/meals/recent?limit=${limit}`),
  getMealById: (mealId) => apiClient.get(`/meals/${mealId}`),
  getMealsByDate: (date) => apiClient.get(`/meals/date/${date}`),
  getMealsByDateRange: (startDate, endDate) => 
    apiClient.get(`/meals/range?start=${startDate}&end=${endDate}`),
  getMealHistory: async (dateRange = null) => {
    try {
      const response = await apiClient.get('/meals/history');
      
      if (response.data) {
        localStorage.setItem('meal_history', JSON.stringify(response.data));
        return { data: response.data };
      } else {
        const cachedData = localStorage.getItem('meal_history');
        if (cachedData) {
          return { data: JSON.parse(cachedData) };
        }
        return { data: [] };
      }
    } catch (error) {
      console.error('Error fetching meal history:', error);
      const cachedData = localStorage.getItem('meal_history');
      if (cachedData) {
        return { data: JSON.parse(cachedData) };
      }
      return { data: [] };
    }
  },
  
  searchFoods: async (query, abortSignal) => {
    console.log(`Searching for foods with query: "${query}"`);
    
    try {
      const response = await apiClient.get(`/meals/search?query=${encodeURIComponent(query)}`, {
        signal: abortSignal
      });
      
      if (response.data) {
        return {
          data: response.data,
          source: 'api'
        };
      }
      
      return {
        data: [],
        source: 'api'
      };
    } catch (error) {
      console.error('Error searching foods:', error);
      throw error;
    }
  },
  
  // POST endpoints
  logMeal: async (mealData) => {
    try {
      const response = await apiClient.post('/meals/log', mealData);
      
      try {
        const cachedHistory = localStorage.getItem('meal_history');
        let history = cachedHistory ? JSON.parse(cachedHistory) : [];
        history = [mealData, ...history];
        localStorage.setItem('meal_history', JSON.stringify(history));
      } catch (cacheError) {
        console.error('Error updating meal history cache:', cacheError);
      }
      
      if (response.data) {
        return {
          data: response.data,
          source: 'api'
        };
      }
      
      return {
        data: {
          ...mealData,
          id: Date.now(),
          timestamp: new Date(),
          source: 'local'
        }
      };
    } catch (error) {
      console.error('Error logging meal:', error);
      
      try {
        const cachedHistory = localStorage.getItem('meal_history');
        let history = cachedHistory ? JSON.parse(cachedHistory) : [];
        history = [mealData, ...history];
        localStorage.setItem('meal_history', JSON.stringify(history));
      } catch (localError) {
        console.error('Error saving meal locally:', localError);
      }
      
      return {
        data: {
          ...mealData,
          id: Date.now(),
          timestamp: new Date(),
          source: 'local'
        }
      };
    }
  },
  updateMeal: async (id, mealData) => {
    try {
      return {
        data: {
          ...mealData,
          id,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Error updating meal:', error);
      throw error;
    }
  },
  deleteMeal: async (id) => {
    try {
      return true;
    } catch (error) {
      console.error('Error deleting meal:', error);
      throw error;
    }
  },
  analyzeMeal: (mealDescription) => 
    Promise.resolve({ data: { analysis: 'Meal analysis not available' } }),
  
  hasMealsToday: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await mealApi.getMealHistory();
      
      if (response?.data) {
        const todayMeals = response.data.filter(meal => {
          const mealDate = new Date(meal.timestamp || meal.logged_at).toISOString().split('T')[0];
          return mealDate === today;
        });
        
        return { data: { has_meals: todayMeals.length > 0 } };
      }
      
      return { data: { has_meals: false } };
    } catch (error) {
      console.error('Error checking meals for today:', error);
      return { data: { has_meals: false } };
    }
  }
};

// Health API endpoints
export const healthApi = {
  _healthStatusCache: {
    data: null,
    timestamp: null,
    MAX_AGE: 5 * 60 * 1000 
  },

  clearStatusCache: () => {
    healthApi._healthStatusCache.data = null;
    healthApi._healthStatusCache.timestamp = null;
  },

  getHealthSummary: () => apiClient.get('/health/summary'),
  getHealthHistory: (limit = 30) => apiClient.get(`/health/history?limit=${limit}`),
  getHealthGoals: () => apiClient.get('/health/goals'),
  getActivityTrends: (days = 30) => apiClient.get(`/health/activity-trends?days=${days}`),
  getNutritionTrends: (days = 30) => apiClient.get(`/health/nutrition-trends?days=${days}`),
  getDailyNutrients: () => apiClient.get('/health/daily-nutrients'),
  
  getStatus: () => {
    const now = Date.now();
    if (healthApi._healthStatusCache.data && 
        healthApi._healthStatusCache.timestamp && 
        (now - healthApi._healthStatusCache.timestamp < healthApi._healthStatusCache.MAX_AGE)) {
      console.log('Using cached health status data');
      return Promise.resolve({ data: healthApi._healthStatusCache.data });
    }
    
    return apiClient.get('/health/status')
      .then(response => {
        healthApi._healthStatusCache.data = response.data;
        healthApi._healthStatusCache.timestamp = now;
        return response;
      })
      .catch(async error => {
        if (error.response && error.response.status === 404) {
          console.log('Health status endpoint not available - generating default status');
          
          try {
            const userResponse = await userApi.getProfile();
            const userData = userResponse?.data || {};
            
            let bmi = null;
            let classification = 'Unknown';
            
            if (userData.height && userData.weight) {
              const heightMeters = userData.height / 100;
              bmi = userData.weight / (heightMeters * heightMeters);
              bmi = Math.round(bmi * 10) / 10;
              
              if (localStorage.getItem('health_classification_updated') === 'true') {
                if (bmi < 18.5) classification = 'At Risk';
                else if (bmi >= 18.5 && bmi < 25) classification = 'Healthy';
                else if (bmi >= 25) classification = 'At Risk';
              }
            }
            
            const defaultStatus = {
              classification: classification,
              bmi: bmi,
              last_updated: new Date().toISOString(),
              estimated: true 
            };
            
            healthApi._healthStatusCache.data = defaultStatus;
            healthApi._healthStatusCache.timestamp = now;
            
            return { data: defaultStatus };
          } catch (profileError) {
            console.error('Error generating default health status:', profileError);
            throw error; 
          }
        }
        
        throw error;
      });
  },
  
  classifyHealth: async (options = {}) => {
    const { update_health_status = true, include_insights = true } = options;
    
    try {
      const userResponse = await userApi.getProfile();
      const userData = userResponse.data;
      
      localStorage.setItem('health_classification_updated', 'true');
      
      let age = 30; 
      if (userData.date_of_birth) {
        try {
          const birthDate = new Date(userData.date_of_birth);
          if (!isNaN(birthDate.getTime())) { 
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDifference = today.getMonth() - birthDate.getMonth();
            if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }
        } catch (dateError) {
          console.warn('Error calculating age from date of birth:', dateError);
        }
      }
      
      let bmi = 23; 
      if (userData.height && userData.weight) {
        const heightMeters = userData.height / 100;
        bmi = userData.weight / (heightMeters * heightMeters);
        bmi = Math.round(bmi * 10) / 10;
      }
      
      const gender = userData.gender || 1; 
      const dailyActivity = userData.daily_physical_activity || 2; 
      
      const heartDisease = userData.heart_disease || false;
      const diabetes = userData.diabetes || false;
      const highBloodPressure = userData.high_blood_pressure || false;
      
      const smoking = userData.smoking || false;
      const alcohol = userData.alcohol_consumption || 0;
      
      let proteinIntake = 60; 
      let carbsIntake = 200; 
      
      try {
        const nutrientResponse = await healthApi.getDailyNutrients();
        if (nutrientResponse.data && nutrientResponse.data.current) {
          proteinIntake = Math.round(nutrientResponse.data.current.protein || proteinIntake);
          carbsIntake = Math.round(nutrientResponse.data.current.carbs || carbsIntake);
        }
      } catch (nutrientError) {
        console.warn('Could not fetch nutrient data for classification:', nutrientError);
      }
      
      const payload = {
        update_health_status,
        include_insights,
        age,
        gender,
        bmi,
        daily_activity: dailyActivity,
        heart_disease: heartDisease,
        diabetes,
        high_blood_pressure: highBloodPressure,
        smoking,
        alcohol,
        protein_intake: proteinIntake,
        carbs_intake: carbsIntake
      };
      
      console.log('Sending health classification data:', payload);
      
      const response = await apiClient.post('/health/classify', payload);
      
      healthApi.clearStatusCache();
      return response;
    } catch (error) {
      console.error('Error classifying health:', error);
      throw error;
    }
  },
  
  logHealth: (healthData) => apiClient.post('/health/log', healthData),
  updateGoals: (goalsData) => apiClient.post('/health/goals', goalsData),
  deleteHealthLog: (logId) => apiClient.delete(`/health/log/${logId}`),
  
  check: () => apiClient.get('/health/check', { timeout: 3000 })
};

// Exercise API endpoints
export const exerciseApi = {
  getRecentExercises: (limit = 5) => apiClient.get(`/exercise/recent?limit=${limit}`),
  getExerciseById: (exerciseId) => apiClient.get(`/exercise/${exerciseId}`),
  getExercisesByDate: (date) => apiClient.get(`/exercise/date/${date}`),
  getExercisesByDateRange: (startDate, endDate) => 
    apiClient.get(`/exercise/range?start=${startDate}&end=${endDate}`),
  getExerciseStats: (days = 30) => apiClient.get(`/exercise/stats?days=${days}`),
  
  getHistory: async (days = 30, forceRefresh = false) => {
    try {
      console.log(`Fetching exercise history for the last ${days} days (forceRefresh: ${forceRefresh})`);
      
      const requestOptions = {
        params: { 
          t: Date.now() 
        }
      };
      
      if (forceRefresh) {
        requestOptions.headers = {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
      }
      
      const response = await apiClient.get(`/exercise/history?days=${days}`, requestOptions);
      
      console.log('Raw exercise history response:', response);
      
      const data = response.data || [];
      
      if (!Array.isArray(data)) {
        console.error('Invalid exercise history format:', data);
        
        if (data && typeof data === 'object' && Array.isArray(data.exercises)) {
          console.log('Found exercises array in non-array response, using it instead');
          const extractedData = data.exercises;
          
          const validExtractedData = extractedData.filter(entry => {
            const isValid = entry && typeof entry === 'object' && 
                          (entry.id || entry._id) && 
                          (entry.timestamp || entry.date || entry.created_at) && 
                          (typeof entry.duration !== 'undefined' || typeof entry.duration_minutes !== 'undefined');
                          
            if (!isValid) {
              console.warn('Skipping invalid extracted exercise entry:', entry);
            }
            
            return isValid;
          });
          
          console.log(`Received ${validExtractedData.length} valid exercise entries from extracted data`);
          
          const normalizedData = validExtractedData.map(entry => ({
            id: entry.id || entry._id,
            timestamp: entry.timestamp || entry.date || entry.created_at,
            duration: entry.duration || entry.duration_minutes || 0,
            activity_type: entry.activity_type || entry.type || "General Exercise"
          }));
          
          normalizedData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          return { data: normalizedData };
        }
        
        return { data: [] };
      }
      
      const validData = data.filter(entry => {
        const isValid = entry && typeof entry === 'object' && 
                      (entry.id || entry._id) && 
                      (entry.timestamp || entry.date || entry.created_at) && 
                      (typeof entry.duration !== 'undefined' || typeof entry.duration_minutes !== 'undefined');
                      
        if (!isValid) {
          console.warn('Skipping invalid exercise history entry:', entry);
        }
        
        return isValid;
      });
      
      console.log(`Received ${validData.length} valid exercise entries out of ${data.length} total`);
      
      const normalizedData = validData.map(entry => ({
        id: entry.id || entry._id,
        timestamp: entry.timestamp || entry.date || entry.created_at,
        duration: entry.duration || entry.duration_minutes || 0,
        activity_type: entry.activity_type || entry.type || "General Exercise"
      }));
      
      normalizedData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return { data: normalizedData };
    } catch (error) {
      console.error('Error fetching exercise history:', error);
      return { data: [] };
    }
  },
  
  getDaily: async (options = {}) => {
    try {
      const { forceRefresh = false } = options;
      
      const requestOptions = {
        params: { 
          t: Date.now(),
          forceRefresh: forceRefresh ? 'true' : 'false'
        }
      };
      
      if (forceRefresh) {
        requestOptions.headers = {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
      }
      
      const response = await apiClient.get(`/exercise/daily`, requestOptions);
      
      if (response && response.data) {
        let totalMinutes = 0;
        let goalMinutes = 30; 
        
        if (Array.isArray(response.data)) {
          totalMinutes = response.data.reduce((sum, exercise) => sum + (exercise.duration_minutes || 0), 0);
        } else if (response.data.exercises && Array.isArray(response.data.exercises)) {
          totalMinutes = response.data.exercises.reduce((sum, exercise) => sum + (exercise.duration_minutes || 0), 0);
          if (response.data.goal_minutes) {
            goalMinutes = response.data.goal_minutes;
          }
        } else if (typeof response.data.total_minutes === 'number') {
          totalMinutes = response.data.total_minutes;
          if (response.data.goal_minutes) {
            goalMinutes = response.data.goal_minutes;
          }
        }
        
        const normalizedResponse = {
          data: {
            total_minutes: totalMinutes,
            goal_minutes: goalMinutes,
            percent: Math.min(Math.round((totalMinutes / goalMinutes) * 100), 100),
            date: new Date().toISOString().split('T')[0]
          }
        };
        
        console.log('Normalized exercise data:', normalizedResponse.data);
        return normalizedResponse;
      }
      
      return {
        data: {
          total_minutes: 0,
          goal_minutes: 30,
          percent: 0,
          date: new Date().toISOString().split('T')[0]
        }
      };
    } catch (error) {
      console.error('Error fetching daily exercise data:', error);
      throw error;
    }
  },
  

  logExercise: async (exerciseData) => {
    try {
      const response = await apiClient.post('/exercise/log', exerciseData);
      
      await exerciseApi.getDaily({ forceRefresh: true });
      
      return response;
    } catch (error) {
      console.error('Error logging exercise:', error);
      throw error;
    }
  },
  
  updateExercise: async (exerciseId, exerciseData) => {
    try {
      const response = await apiClient.put(`/exercise/${exerciseId}`, exerciseData);
      
      await exerciseApi.getDaily();
      
      return response;
    } catch (error) {
      console.error('Error updating exercise:', error);
      throw error;
    }
  },
  
  deleteExercise: async (exerciseId) => {
    try {
      const response = await apiClient.delete(`/exercise/${exerciseId}`);
      
      await exerciseApi.getDaily({ forceRefresh: true });
      
      return response;
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  }
};

// Recommendation API endpoints
export const recommendationApi = {
  _isGeneratingRecommendations: false,
  
  getRecommendations: async (count = 3, regenerate = false, timestamp) => {
    console.log(`Getting recommendations with regenerate=${regenerate}, count=${count}`);
    
    if (regenerate) {
      recommendationApi._isGeneratingRecommendations = true;
    }
    
    try {
      const timeParam = timestamp ? `&t=${timestamp}` : '';
      const url = `/recommendations?count=${count}&regenerate=${regenerate}${timeParam}`;
      
      const options = regenerate ? { timeout: 180000 } : { timeout: 90000 }; 
      
      const response = await apiClient.get(url, options);
      
      if (regenerate) {
        recommendationApi._isGeneratingRecommendations = false;
      }
      
      return response;
    } catch (error) {
      if (error.code === 'ECONNABORTED' && regenerate) {
        console.error('Recommendation request timed out, but generation may still be in progress.');
        error.message = 'The recommendation generation is taking longer than expected. The process will continue in the background - please try again in a minute.';
        error.stillGenerating = true;
      } else if (regenerate) {
        recommendationApi._isGeneratingRecommendations = false;
      }
      
      throw error;
    }
  },
  
  isGenerating: () => recommendationApi._isGeneratingRecommendations,
  
  checkHealth: () => apiClient.get('/recommendations/health'),
  
  getDebugInfo: () => apiClient.get('/recommendations/debug'),
  
  dislikeRecommendation: (recommendationId) => 
    apiClient.post(`/recommendations/dislike/${recommendationId}`),
};

// Water tracking API endpoints
export const waterApi = {
  _waterChangeListeners: [],
  
  addWaterChangeListener: (callback) => {
    waterApi._waterChangeListeners.push(callback);
    return () => {
      waterApi._waterChangeListeners = waterApi._waterChangeListeners.filter(cb => cb !== callback);
    };
  },
  
  _notifyWaterChange: (data) => {
    waterApi._waterChangeListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in water change listener:', error);
      }
    });
  },
  
  getWaterHistory: (limit = 30, options = {}) => {
    return apiClient.get(`/water/history?limit=${limit}`, {
      allowDuplicate: true,
      ...options // Allow passing in other options
    })
      .then(response => {
        if (response && response.data) {
          localStorage.setItem('water_history', JSON.stringify(response.data));
          return response;
        }
        throw new Error('Invalid response format');
      })
      .catch(error => {
        if (error.code === 'ERR_DUPLICATE' && error.isBenign) {
          console.log('Duplicate water history request detected, checking cache');
          const cachedData = localStorage.getItem('water_history');
          if (cachedData) {
            try {
              const parsedData = JSON.parse(cachedData);
              return { data: parsedData, source: 'cache' };
            } catch (parseError) {
              console.error('Error parsing cached water history:', parseError);
            }
          }
        } else {
          console.warn('Water history API error:', error);
        }
        
        
        const cachedData = localStorage.getItem('water_history');
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            return { data: parsedData, source: 'cache' };
          } catch (parseError) {
            console.error('Error parsing cached water history:', parseError);
          }
        }
        
        return { data: [] };
      });
  },
  
  getTodayWater: async () => {
    const today = waterApi._getTodayDate();
    console.log(`Getting water intake for today (${today})`);
    
    try {
      const waterApiUnavailable = localStorage.getItem('water_api_unavailable') === 'true';
      
      if (!waterApiUnavailable) {
        try {
          const response = await apiClient.get('/water/today', {
            timeout: 5000,
            allowDuplicate: true
          });
          
          if (response && response.data && typeof response.data.glasses === 'number') {
            console.log(`Got today's water from API: ${response.data.glasses} glasses`);
            
            const cachedData = localStorage.getItem('water_history');
            if (cachedData) {
              try {
                let waterHistory = JSON.parse(cachedData);
                const todayIndex = waterHistory.findIndex(entry => entry.date === today);
                
                if (todayIndex >= 0) {
                  waterHistory[todayIndex].glasses = response.data.glasses;
                } else {
                  waterHistory.push({ date: today, glasses: response.data.glasses });
                }
                
                localStorage.setItem('water_history', JSON.stringify(waterHistory));
              } catch (e) {
                console.error('Error updating water history in local storage:', e);
              }
            }
            
            return { glasses: response.data.glasses, source: 'api' };
          }
        } catch (apiError) {
          if (apiError.code === 'ERR_DUPLICATE' && apiError.isBenign) {
            console.log('Duplicate water request detected, will check cache');
          } else {
            console.warn('Error getting today\'s water from API:', apiError);
            if (apiError.response && apiError.response.status === 404) {
              localStorage.setItem('water_api_unavailable', 'true');
            }
          }
        }
      }
      
      // Fall back to local storage
      const cachedData = localStorage.getItem('water_history');
      if (cachedData) {
        try {
          const waterHistory = JSON.parse(cachedData);
          const todayEntry = waterHistory.find(entry => entry.date === today);
          
          if (todayEntry) {
            console.log(`Using cached water data: ${todayEntry.glasses} glasses`);
            return { glasses: todayEntry.glasses, source: 'cache' };
          }
        } catch (e) {
          console.error('Error parsing water history from local storage:', e);
        }
      }
      
      console.log('No water data found for today, returning 0');
      return { glasses: 0, source: 'default' };
    } catch (error) {
      console.error('Error in getTodayWater:', error);
      return { glasses: 0, source: 'error' };
    }
  },
  
  logWater: async (waterData) => {
    const today = waterApi._getTodayDate();
    const glasses = parseInt(waterData.glasses || 0, 10);
    console.log(`Logging water intake: ${glasses} glasses for ${today}`);
    
    const payload = {
      date: waterData.date || today,
      glasses: glasses
    };
    
    try {
      const waterApiUnavailable = localStorage.getItem('water_api_unavailable') === 'true';
      
      let apiSuccess = false;
      let response = null;
      
      if (!waterApiUnavailable) {
        try {
          response = await apiClient.post('/water/log', payload);
          apiSuccess = true;
          
          if (localStorage.getItem('water_api_unavailable')) {
            localStorage.removeItem('water_api_unavailable');
          }
        } catch (apiError) {
          console.warn('Water logging API error:', apiError);
          
          if (apiError.response && apiError.response.status === 404) {
            localStorage.setItem('water_api_unavailable', 'true');
          }
        }
      }
      
      try {
        const cachedData = localStorage.getItem('water_history');
        let waterHistory = [];
        
        if (cachedData) {
          waterHistory = JSON.parse(cachedData);
          waterHistory = waterHistory.filter(entry => entry.date !== payload.date);
        }
        
        // Add the new entry
        waterHistory.push(payload);
        
        // Save back to localStorage
        localStorage.setItem('water_history', JSON.stringify(waterHistory));
        
        waterApi._notifyWaterChange({
          ...payload,
          source: apiSuccess ? 'api' : 'local'
        });
        
        if (apiSuccess && response) {
          return response;
        }
        
        return { 
          data: { 
            success: true, 
            message: 'Data saved (API unavailable, using local storage)',
            glasses: glasses,
            date: payload.date
          },
          status: 200,
          source: 'local'
        };
      } catch (storageError) {
        console.error('Error saving water data to localStorage:', storageError);
        
        if (apiSuccess && response) {
          return response;
        }
        
        throw new Error('Failed to save water data');
      }
    } catch (error) {
      console.error('Error in logWater:', error);
      throw error;
    }
  },
  
  _getTodayDate: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  },
  
  // Ensure today's entry exists in the water history
  _ensureTodayEntryExists: () => {
    try {
      waterApi._cleanWaterHistory();

      const today = waterApi._getTodayDate();
      
      const cachedData = localStorage.getItem('water_history');
      
      if (!cachedData) {
        const newHistory = [{ date: today, glasses: 0 }];
        localStorage.setItem('water_history', JSON.stringify(newHistory));
        console.log(`Created new water history with entry for ${today}`);
      }
    } catch (error) {
      console.error('Error ensuring today\'s entry exists in water history:', error);
    }
  },
  
  _cleanWaterHistory: () => {
    try {
      const today = waterApi._getTodayDate();
      
      const cachedData = localStorage.getItem('water_history');
      
      if (cachedData) {
        const waterHistory = JSON.parse(cachedData);
        const filteredHistory = waterHistory.filter(entry => {
          const entryDate = new Date(entry.date);
          const todayDate = new Date(today);
          const timeDiff = Math.abs(todayDate - entryDate);
          const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          return daysDiff <= 30;
        });
        
        localStorage.setItem('water_history', JSON.stringify(filteredHistory));
      }
    } catch (error) {
      console.error('Error cleaning water history:', error);
    }
  },
};

// Error handling utility
export const handleApiError = (error) => {
  console.error('API Error:', error);
  const message = error.response?.data?.detail || error.message || 'An error occurred';
  
  return {
    message,
    status: error.response?.status,
    data: error.response?.data
  };
};

// Nutrient API endpoints
export const nutrientApi = {
  getDailyNutrients: async () => {
    try {
      return await apiClient.get('/health/daily-nutrients', {
        allowDuplicate: true 
      });
    } catch (error) {
      console.error('Error fetching daily nutrients:', error);
      throw error;
    }
  },
  getNutrientTargets: async () => {
    try {
      return await apiClient.get('/health/nutrient-targets', {
        allowDuplicate: true 
      });
    } catch (error) {
      console.error('Error fetching nutrient targets:', error);
      throw error;
    }
  },
  updateNutrientTargets: (targets) => apiClient.post('/health/update-nutrient-targets', targets),
  getNutrientHistory: (dateRange) => apiClient.get(`/nutrients/history?start=${dateRange.start}&end=${dateRange.end}`)
};

// Future Health Insights API endpoints
export const futureInsightApi = {
  pendingRequests: new Map(),
  
  cancelPendingRequest: (requestId) => {
    if (futureInsightApi.pendingRequests.has(requestId)) {
      const controller = futureInsightApi.pendingRequests.get(requestId);
      controller.abort();
      futureInsightApi.pendingRequests.delete(requestId);
    }
  },
  
  getInsights: async () => {
    const requestId = 'get-insights';
    
    try {
      const controller = new AbortController();
      futureInsightApi.pendingRequests.set(requestId, controller);
      
      const response = await apiClient.get('/future-insights', {
        signal: controller.signal,
        timeout: 30000, 
        allowDuplicate: true 
      });
      
      futureInsightApi.pendingRequests.delete(requestId);
      
      return response;
    } catch (error) {
      futureInsightApi.pendingRequests.delete(requestId);
      
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log('Request was cancelled - this is often normal behavior');
        
        const cachedData = localStorage.getItem('future_insights');
        if (cachedData) {
          try {
            return { data: JSON.parse(cachedData), source: 'cache' };
          } catch (e) {
            console.error('Error parsing cached insights:', e);
          }
        }
      }
      
      throw error;
    }
  },
  
  generateInsights: async () => {
    const requestId = 'generate-insights';
    
    futureInsightApi.cancelPendingRequest(requestId);
    
    try {
      const controller = new AbortController();
      futureInsightApi.pendingRequests.set(requestId, controller);
      
      const response = await apiClient.post('/future-insights/generate', {}, {
        signal: controller.signal,
        timeout: 60000 
      });
      
      if (response && response.data) {
        localStorage.setItem('future_insights', JSON.stringify(response.data));
      }
      
      futureInsightApi.pendingRequests.delete(requestId);
      
      return response;
    } catch (error) {
      futureInsightApi.pendingRequests.delete(requestId);
      
      throw error;
    }
  }
};

const api = {
  user: userApi,
  auth: authApi,
  meal: mealApi,
  exercise: exerciseApi,
  health: healthApi,
  water: waterApi,
  nutrient: nutrientApi,
  recommendation: recommendationApi,
  futureInsight: futureInsightApi
};

export default api;