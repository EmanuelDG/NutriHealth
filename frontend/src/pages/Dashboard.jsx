import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { useToast } from '../hooks/use-toast';
import { exerciseApi, healthApi, nutrientApi, userApi, handleApiError, mealApi, waterApi, syncNutritionalTargets, getUnifiedNutrientTargets } from '../services/api';
import { CalendarIcon, ArrowRightIcon, ListChecksIcon, BarChart3Icon, DumbbellIcon, UtensilsIcon, DropletIcon, Plus, Loader2, Check, CalendarDays, RefreshCw } from "lucide-react";

// Add a utility function to round numbers for display
const roundNutrientValue = (value) => {
  if (typeof value !== 'number') return value;
  return Math.round(value * 10) / 10;
};

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const hasLoadedData = useRef(false);
  const isActive = useRef(true);
  
  // State management
  const [user, setUser] = useState({ name: 'User' });
  const [bmiData, setBmiData] = useState([]);
  const [exerciseMinutes, setExerciseMinutes] = useState(0);
  const [exerciseGoal, setExerciseGoal] = useState(30);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [waterGoal] = useState(8);
  const [nutrientGoals, setNutrientGoals] = useState({
    calories: { current: 0, target: 0, unit: "kcal" },
    protein: { current: 0, target: 0, unit: "g" },
    carbs: { current: 0, target: 0, unit: "g" },
    fats: { current: 0, target: 0, unit: "g" },
    sugar: { current: 0, target: 0, unit: "g" },
    fiber: { current: 0, target: 0, unit: "g" }
  });
  const [lastMeal, setLastMeal] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [isApiCallInProgress, setIsApiCallInProgress] = useState(false);
  const [exercisePercent, setExercisePercent] = useState(0);
  const [dailyExerciseTotal, setDailyExerciseTotal] = useState(0);
  const [userData, setUserData] = useState(null);
  const [exerciseData, setExerciseData] = useState({ minutes: 0, goal: 30, percent: 0 });
  const [achievementMessage, setAchievementMessage] = useState(null);
  
  // Initial data loading
  useEffect(() => {
    // Load exercise from history
    loadExerciseDataFromHistory().catch(() => verifyExerciseData(true));
    
    // Load cached water intake from localStorage
    try {
      // Check if water API unavailable and use localStorage data
      const waterApiUnavailable = localStorage.getItem('water_api_unavailable') === 'true';
      const cachedWaterHistory = localStorage.getItem('water_history');
      
      if (waterApiUnavailable && cachedWaterHistory) {
        const parsedWaterHistory = JSON.parse(cachedWaterHistory);
        const today = new Date().toISOString().split('T')[0];
        const todayEntry = parsedWaterHistory.find(entry => entry.date === today);
        
        if (todayEntry) {
          setWaterGlasses(todayEntry.glasses);
        }
      }
    } catch (e) {
      console.error('Error loading cached water data:', e);
    }
    
    // Load cached nutrient goals
    try {
      const cachedNutrientGoals = localStorage.getItem('nutrient_goals');
      if (cachedNutrientGoals) {
        const parsedNutrientGoals = JSON.parse(cachedNutrientGoals);
        const today = new Date().toISOString().split('T')[0];
        

        console.log('Loading cached nutrient targets from storage:', parsedNutrientGoals);
        

        setNutrientGoals(prev => ({
          calories: { ...prev.calories, target: parsedNutrientGoals.goals.calories.target },
          protein: { ...prev.protein, target: parsedNutrientGoals.goals.protein.target },
          carbs: { ...prev.carbs, target: parsedNutrientGoals.goals.carbs.target },
          fats: { ...prev.fats, target: parsedNutrientGoals.goals.fats.target },
          sugar: { ...prev.sugar, target: parsedNutrientGoals.goals.sugar.target },
          fiber: { ...prev.fiber, target: parsedNutrientGoals.goals.fiber.target }
        }));
        

        if (parsedNutrientGoals.date === today) {
          console.log('Consumption data is from today, using cached values');
          setNutrientGoals(prev => ({
            calories: { ...prev.calories, current: parsedNutrientGoals.goals.calories.current },
            protein: { ...prev.protein, current: parsedNutrientGoals.goals.protein.current },
            carbs: { ...prev.carbs, current: parsedNutrientGoals.goals.carbs.current },
            fats: { ...prev.fats, current: parsedNutrientGoals.goals.fats.current },
            sugar: { ...prev.sugar, current: parsedNutrientGoals.goals.sugar.current },
            fiber: { ...prev.fiber, current: parsedNutrientGoals.goals.fiber.current }
          }));
        } else {
          console.log('Consumption data is not from today, will fetch fresh data');
        }
      } else {
        console.log('No cached nutrient goals found, will load from API');
      }
    } catch (e) {
      console.error('Error loading cached nutrient goals:', e);
    }
    

    const loadInitialNutrientData = async () => {
      try {
        if (nutrientGoals.calories.current > 0 || nutrientGoals.protein.current > 0) {
          console.log('Nutrient data already loaded, skipping API call');
          return;
        }
        
        console.log('Performing immediate check for meal data...');
        
        // attempt to load from meal history directly
        try {
          const mealsResponse = await mealApi.getMealHistory();
          
          if (mealsResponse?.data && mealsResponse.data.length > 0) {
            console.log(`Found ${mealsResponse.data.length} meals in history`);
            
            // Get today's meals
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const todayMeals = mealsResponse.data.filter(meal => {
              const mealDate = new Date(meal.timestamp);
              return mealDate.toISOString().split('T')[0] === today;
            });
            
            console.log(`Found ${todayMeals.length} meals from today:`, todayMeals);
            
            if (todayMeals.length > 0) {
              // Calculate nutrient totals
              const nutrients = {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                sugar: 0,
                fiber: 0
              };
              
              // sum up all meals
              todayMeals.forEach(meal => {
                nutrients.calories += Number(meal.calories || 0);
                nutrients.protein += Number(meal.protein || meal.proteins || 0);
                nutrients.carbs += Number(meal.carbs || meal.carbohydrates || 0);
                nutrients.fats += Number(meal.fats || meal.fat || 0);
                nutrients.sugar += Number(meal.sugar || 0);
                nutrients.fiber += Number(meal.fiber || 0);
              });
              
              console.log('Calculated nutrient totals on initial load:', nutrients);
              
              // update state with this information
              setNutrientGoals(prev => ({
                calories: { ...prev.calories, current: nutrients.calories },
                protein: { ...prev.protein, current: nutrients.protein },
                carbs: { ...prev.carbs, current: nutrients.carbs },
                fats: { ...prev.fats, current: nutrients.fats },
                sugar: { ...prev.sugar, current: nutrients.sugar },
                fiber: { ...prev.fiber, current: nutrients.fiber }
              }));
            }
          }
        } catch (e) {
          console.error('Error fetching meal history on initial load:', e);
        }
      } catch (e) {
        console.error('Error in loadInitialNutrientData:', e);
      }
    };
    
    loadInitialNutrientData();
  }, []);
  
  // Load water data
  useEffect(() => {
    const loadTodayWaterData = async () => {
      console.log('Loading today\'s water data from API');
      
      try {
        const response = await waterApi.getTodayWater();
        if (response && typeof response.glasses === 'number') {
          setWaterGlasses(response.glasses);
          console.log(`Water data loaded: ${response.glasses} glasses`);
        } else {
          console.warn('Invalid water data format:', response);
        }
      } catch (error) {
        console.error('Error loading water data:', error);
        

        if (error.response && error.response.status !== 404) {
          toast({
            title: "Error",
            description: "Could not load water intake data. Please try again.",
            variant: "destructive"
          });
        }
      }
    };
    
    loadTodayWaterData();
    
    const intervalId = setInterval(() => {
      loadTodayWaterData();
    }, 900000); // 15 minutes
    
    return () => {
      clearInterval(intervalId);

    };
  }, []);

  useEffect(() => {
    if (hasLoadedData.current) {
      setIsLoading(false);
      return;
    }
    
    hasLoadedData.current = true;
    isActive.current = true;
    

    const loadInitialData = async () => {
      console.log("Starting initial data loading sequence");
      setIsLoading(true);
      setLoadingError(null);
      
      try {
        // load basic dashboard data
        try {
          await loadDashboardData();
          console.log("Dashboard data loaded successfully");
        } catch (dashboardError) {
          console.error("Error loading dashboard data, but will show the UI anyway", dashboardError);
        }
        
        try {
          console.log("Fetching fresh exercise data from server...");
          await loadExerciseDataFromHistory();
          console.log("Exercise data loaded successfully");
        } catch (exerciseError) {
          console.error("Error loading exercise data, but will show the UI anyway", exerciseError);
          

          try {
            await verifyExerciseData(true);
          } catch (fallbackError) {
            console.error("Fallback exercise data loading also failed", fallbackError);
          }
        }
        

        try {
          console.log("Fetching fresh nutritional targets from database...");
          await loadNutritionData();
          console.log("Nutritional targets loaded successfully");
        } catch (nutritionError) {
          console.error("Error loading nutritional targets, but will show the UI anyway", nutritionError);
        }
      } catch (error) {
        console.error("Error in initial data loading:", error);
        setLoadingError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
    
    return () => {
      isActive.current = false;
    };
  }, []);
  

  useEffect(() => {
    console.log('Dashboard page focused or route changed, refreshing data');
    
    const refreshAllDashboardData = async () => {
      try {
        if (!isActive.current) return;
        hasLoadedData.current = false;
        
        await loadDashboardData();

        await loadExerciseDataFromHistory();
        
        fetchLastMeal();
        
        console.log('Dashboard data refreshed successfully');
      } catch (error) {
        console.error('Error refreshing dashboard data:', error);
        
        // verifyExerciseData if loadExerciseDataFromHistory fails
        try {
          await verifyExerciseData(true);
        } catch (exerciseError) {
          console.error('Error refreshing exercise data:', exerciseError);
        }
      } finally {

        hasLoadedData.current = true;
      }
    };
    
    refreshAllDashboardData();

    const handleFocus = () => {
      console.log('Window focused, refreshing dashboard data');
      refreshAllDashboardData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [location.pathname]);
  
  // refresh exercise data when the page is focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Dashboard is now visible, refreshing exercise data');
        verifyExerciseData(true); // Force refresh from server
      }
    };

    const handleFocus = () => {
      console.log('Dashboard window focused, refreshing exercise data');
      verifyExerciseData(true); 
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  

  const loadExerciseDataFromHistory = async () => {
    try {
      console.log('Loading exercise data directly from history database...');
      
      // force a refresh of the exercise history
      const today = new Date().toISOString().split('T')[0];
      const historyResponse = await exerciseApi.getHistory(1, true); 
      
      const todaysEntries = historyResponse.data ? historyResponse.data.filter(entry => {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        return entryDate === today;
      }) : [];
      
      console.log(`Found ${todaysEntries.length} entries for today from database`);
      

      const totalMinutes = todaysEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      const goalMinutes = exerciseGoal || 30; 
      
      console.log(`Calculated total minutes directly from database: ${totalMinutes}`);
      
      updateExerciseDisplay(totalMinutes, false);

      try {
        await exerciseApi.getDaily({ forceRefresh: true });
      } catch (dailyError) {
        console.error('Error fetching daily totals (non-critical):', dailyError);
      }
      

      localStorage.setItem('last_exercise_date', today);
      
      return totalMinutes;
    } catch (error) {
      console.error('Error loading exercise data from history:', error);
      throw error;
    }
  };
  

  const verifyExerciseData = async (isInitialLoad = false) => {
    try {
      console.log("Getting exercise data from server...");

      const resetForNewDay = () => {
        // get the last exercise update date from localStorage
        const lastExerciseDate = localStorage.getItem('last_exercise_date');
        const today = new Date().toISOString().split('T')[0]; 
        
        if (lastExerciseDate !== today) {
          console.log(`Exercise data needs reset: last update ${lastExerciseDate}, today ${today}`);
          localStorage.setItem('last_exercise_date', today);
          return true;
        }
        return false;
      };


      const needsReset = isInitialLoad ? resetForNewDay() : false;
      
      // load data directly from exercise history for accurate data
      await loadExerciseDataFromHistory();
    } catch (error) {
      console.error('Error getting exercise data:', error);
      

      try {
        console.log("Falling back to getDaily API...");
        const response = await exerciseApi.getDaily({ forceRefresh: true });
        
        if (response && response.data) {
          const serverMinutes = response.data.total_minutes || 0;

          updateExerciseDisplay(serverMinutes, false);

          if (response.data.goal_minutes) {
            setExerciseGoal(response.data.goal_minutes);
          }
          
          const today = new Date().toISOString().split('T')[0]; 
          localStorage.setItem('last_exercise_date', today);
        }
      } catch (fallbackError) {
        console.error('Fallback to getDaily also failed:', fallbackError);
        

        const today = new Date().toISOString().split('T')[0]; 
        const lastExerciseDate = localStorage.getItem('last_exercise_date');
        
        if (lastExerciseDate !== today) {
          console.log('Could not fetch fresh data but it appears to be a new day. Resetting exercise display.');
          updateExerciseDisplay(0, false);
          localStorage.setItem('last_exercise_date', today);
        }
      }
    }
  };

  // Function to load dashboard data from API
  const loadDashboardData = async () => {
    console.log('Loading dashboard data from API...');
    
    try {

      try {
        let userResponse;
        try {
          userResponse = await userApi.getProfile();
        } catch (apiError) {
          console.error('User profile API call error:', apiError);
          setUser({
            name: 'User',
            height: null,
            weight: null,
          });
          throw apiError; // Re-throw to be caught by outer catch
        }
        
        if (userResponse && userResponse.data) {
          setUserData(userResponse.data);
          
          setUser({
            name: typeof userResponse.data.name === 'string' && userResponse.data.name !== 'string' 
              ? userResponse.data.name 
              : userResponse.data.username || 'User',
            username: userResponse.data.username,
            height: userResponse.data.height,
            weight: userResponse.data.weight,
          });
          
          // Calculate BMI
          if (userResponse.data.height && userResponse.data.weight) {
            const heightInMeters = userResponse.data.height / 100;
            const currentBmi = (userResponse.data.weight / (heightInMeters * heightInMeters)).toFixed(1);
            
            const bmiDataArray = [{ 
              month: 'Current', 
              bmi: parseFloat(currentBmi),
              healthyLowerLimit: 18.5,
              healthyUpperLimit: 25
            }];
            
            // Get current BMI value from API 
            try {
              if (typeof userApi.getBmiHistory === 'function') {
                const bmiResponse = await userApi.getBmiHistory();
                if (bmiResponse && bmiResponse.data && Array.isArray(bmiResponse.data) && 
                    bmiResponse.data.length > 0 && bmiResponse.data[0].bmi) {
                  bmiDataArray[0].bmi = parseFloat(bmiResponse.data[0].bmi.toFixed(1));
                }
              }
            } catch (bmiError) {
              console.error('Error getting current BMI:', bmiError);
            }
            
            console.log('Setting BMI data:', bmiDataArray);
            setBmiData(bmiDataArray);
          } else {
            console.log('Height or weight missing, cannot calculate BMI');
            setBmiData([]);
          }
        }
      } catch (userError) {
        console.error('Error fetching user profile:', userError);
      }
      
      // Try to get health status separately
      try {
        const healthResponse = await healthApi.getStatus();
        if (healthResponse && healthResponse.data) {
          setHealthStatus(healthResponse.data.classification);
        }
      } catch (healthError) {
        console.error('Error loading health status:', healthError);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      return { success: true, error };
    }
  };

  // Increment water glasses
  const handleWaterIncrement = () => {
    const newValue = waterGlasses + 1;
    
    const today = waterApi._getTodayDate();
    
    setWaterGlasses(newValue);
    
    waterApi.logWater({
      glasses: newValue,
      date: today
    })
      .then(response => {
        console.log('Water intake saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving water intake:', error);
        setWaterGlasses(waterGlasses);
        toast({
          title: "Error",
          description: "Could not save water intake. Please try again.",
          variant: "destructive"
        });
      });
  };
  
  // Decrement water glasses
  const handleWaterDecrement = () => {
    if (waterGlasses <= 0) return;
    
    const newValue = waterGlasses - 1;
    
    setWaterGlasses(newValue);
    
    const today = waterApi._getTodayDate();
    waterApi.logWater({
      glasses: newValue,
      date: today
    })
      .then(response => {
        console.log('Water intake saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving water intake:', error);
        setWaterGlasses(waterGlasses);
        toast({
          title: "Error",
          description: "Could not save water intake. Please try again.",
          variant: "destructive"
        });
      });
  };

  // Calculate nutrient progress percentages
  const calculateProgress = (current, target) => {
    if (!target || target <= 0) return 0;
    if (!current) return 0;
    
    const percentage = Math.min(Math.round((current / target) * 100), 100);
    return percentage;
  };

  // Update nutritional targets
  const updateNutritionalTargets = async (showToasts = true) => {
    try {
      if (isApiCallInProgress) return;
      setIsApiCallInProgress(true);
      
      if (showToasts) {
        toast({
          title: "Updating nutritional targets...",
          description: "Please wait while we recalculate your targets based on your profile.",
        });
      }
      
      const currentBmi = bmiData.length > 0 ? bmiData[0].bmi : null;
      console.log("Current BMI for nutritional target calculation:", currentBmi);
      
      // Get current consumption data from state for later
      const currentConsumption = {
        calories: nutrientGoals.calories.current || 0,
        protein: nutrientGoals.protein.current || 0,
        carbs: nutrientGoals.carbs.current || 0,
        fats: nutrientGoals.fats.current || 0,
        sugar: nutrientGoals.sugar.current || 0,
        fiber: nutrientGoals.fiber.current || 0
      };
      
      try {
        await loadDashboardData();
        console.log("Refreshed user data for nutrient calculations");
      } catch (bmiError) {
        console.error("Failed to refresh BMI data:", bmiError);
        
        if (showToasts) {
          toast({
            title: "Warning",
            description: "Could not refresh body metrics. Calculations may not be optimal.",
            variant: "destructive"
          });
        }
      }
      
      try {
        const unifiedTargets = await syncNutritionalTargets(currentBmi);
        console.log("Received unified nutritional targets:", unifiedTargets);
        
        const updatedGoals = {
          calories: { current: currentConsumption.calories, target: unifiedTargets.calorieTarget, unit: "kcal" },
          protein: { current: currentConsumption.protein, target: unifiedTargets.protein, unit: "g" },
          carbs: { current: currentConsumption.carbs, target: unifiedTargets.carbs, unit: "g" },
          fats: { current: currentConsumption.fats, target: unifiedTargets.fats, unit: "g" },
          sugar: { current: currentConsumption.sugar, target: unifiedTargets.sugar, unit: "g" },
          fiber: { current: currentConsumption.fiber, target: unifiedTargets.fiber, unit: "g" }
        };
        
        setNutrientGoals({...updatedGoals});
        
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('nutrient_goals', JSON.stringify({
          date: today,
          goals: updatedGoals,
          refreshed: true,
          bmi: currentBmi 
        }));
      } catch (targetError) {
        console.error("Failed to synchronize nutritional targets:", targetError);
        
        if (showToasts) {
          toast({
            title: "Error",
            description: "Could not update nutritional targets. Please try again.",
            variant: "destructive"
          });
        }
        
      }
      
      setTimeout(() => {
        try {
          const progressBars = document.querySelectorAll('.nutrient-progress');
          if (progressBars.length > 0) {
            console.log("Refreshing progress bars:", progressBars.length);
            progressBars.forEach(el => {
              el.classList.add('progress-updating');
              setTimeout(() => el.classList.remove('progress-updating'), 50);
            });
          } else {
            console.log("No progress bars found to refresh");
          }
        } catch (domError) {
          console.error("Error refreshing progress bars:", domError);
        }
      }, 100);
      
      if (showToasts) {
        toast({
          title: "Targets updated successfully",
          description: currentBmi 
            ? `Your nutritional targets have been recalculated based on your BMI of ${currentBmi}.`
            : `Your nutritional targets have been recalculated based on your current profile data.`,
        });
      }
    } catch (error) {
      console.error("Error updating nutritional targets:", error);
      if (showToasts) {
        toast({
          title: "Failed to update targets",
          description: "Could not recalculate your nutritional targets. Using default values instead.",
          variant: "destructive",
        });
      }
    } finally {
      setIsApiCallInProgress(false);
    }
  };

  // Function to fetch and set the last meal
  const fetchLastMeal = async () => {
    try {
      console.log('Fetching latest meal data...');
      let foundMeal = false;
      
      try {
        const mealsResponse = await mealApi.getMealHistory(1); 
        
        if (mealsResponse && mealsResponse.data && mealsResponse.data.length > 0) {
          const mostRecentMeal = mealsResponse.data[0];
          console.log('Retrieved most recent meal from API:', mostRecentMeal);
          
          setLastMeal({
            name: mostRecentMeal.meal_name || mostRecentMeal.name,
            time: new Date(mostRecentMeal.timestamp || mostRecentMeal.logged_at).toLocaleString(),
            calories: mostRecentMeal.calories,
            protein: mostRecentMeal.protein,
            carbs: mostRecentMeal.carbohydrates || mostRecentMeal.carbs,
            fats: mostRecentMeal.fats || mostRecentMeal.fat,
            sugar: mostRecentMeal.sugar || 0,
            fiber: mostRecentMeal.fiber || 0
          });
          foundMeal = true;
        }
      } catch (apiError) {
        console.log('Could not fetch meals from API, using cached data if available:', apiError);
      }
      
      // If no meal found from API, try local storage
      if (!foundMeal) {
        try {
          const cachedMealHistory = localStorage.getItem('meal_history');
          if (cachedMealHistory) {
            const mealHistory = JSON.parse(cachedMealHistory);
            if (mealHistory && mealHistory.length > 0) {
              mealHistory.sort((a, b) => {
                return new Date(b.timestamp || b.logged_at) - new Date(a.timestamp || a.logged_at);
              });
              
              const mostRecentMeal = mealHistory[0];
              console.log('Retrieved most recent meal from localStorage:', mostRecentMeal);
              
              setLastMeal({
                name: mostRecentMeal.meal_name || mostRecentMeal.name,
                time: new Date(mostRecentMeal.timestamp || mostRecentMeal.logged_at).toLocaleString(),
                calories: mostRecentMeal.calories,
                protein: mostRecentMeal.protein,
                carbs: mostRecentMeal.carbohydrates || mostRecentMeal.carbs,
                fats: mostRecentMeal.fats || mostRecentMeal.fat,
                sugar: mostRecentMeal.sugar || 0,
                fiber: mostRecentMeal.fiber || 0
              });
              foundMeal = true;
            }
          }
        } catch (storageError) {
          console.error('Error retrieving meal history from localStorage:', storageError);
        }
      }
      
      if (!foundMeal) {
        console.log('No meal data found in API or localStorage');
      }
    } catch (error) {
      console.error('Error in fetchLastMeal:', error);
    }
  };

  // Function to update exercise minutes in the UI
  const updateExerciseDisplay = (totalMinutes, isNewAchievement = false) => {
    console.log(`updateExerciseDisplay called with total minutes: ${totalMinutes}`);
    
    const dailyTotal = totalMinutes;
    
    // Calculate percentage
    const percent = Math.min(Math.round((dailyTotal / exerciseGoal) * 100), 100);
    console.log(`Calculated exercise percentage: ${percent}% (${dailyTotal}/${exerciseGoal})`);
    
    setExercisePercent(percent);
    setDailyExerciseTotal(dailyTotal);
    
    if (isNewAchievement && percent >= 100 && dailyTotal > 0) {
      toast({
        title: "Congratulations!",
        description: "You've reached your exercise goal today!",
        variant: "success",
      });
    }
    
    console.log(`UI updated with: dailyTotal=${dailyTotal}, percent=${percent}%`);
  };

  // Load exercise data only from server API
  useEffect(() => { 
    loadExerciseDataFromHistory().catch(() => verifyExerciseData(true));
  }, []);

  // Function to clear exercise cache and refresh from server
  const clearExerciseCache = () => {
    setExerciseMinutes(0);
    
    loadExerciseDataFromHistory()
      .catch(error => {
        console.error('Error refreshing exercise data from history:', error);
        verifyExerciseData(true);
      });
      
    toast({
      title: "Exercise data refreshed",
      description: "Exercise data has been synchronized with the server",
      variant: "default",
    });
  };

  // Function to load nutrition data from API or local storage
  const loadNutritionData = async () => {
    try {
      try {
        const unifiedTargets = getUnifiedNutrientTargets();
        
        if (unifiedTargets) {
          console.log("Loading unified targets from shared cache:", unifiedTargets);
          
          setNutrientGoals(prev => ({
            calories: { ...prev.calories, target: unifiedTargets.calorieTarget },
            protein: { ...prev.protein, target: unifiedTargets.protein },
            carbs: { ...prev.carbs, target: unifiedTargets.carbs },
            fats: { ...prev.fats, target: unifiedTargets.fats },
            sugar: { ...prev.sugar, target: unifiedTargets.sugar },
            fiber: { ...prev.fiber, target: unifiedTargets.fiber }
          }));
          
          if (prev => prev.calories.current === 0 && prev.protein.current === 0) {
            await loadConsumptionData();
          }
          
          return; 
        }
        
        console.log("No unified targets found, synchronizing now");
        const freshTargets = await syncNutritionalTargets();
        
        setNutrientGoals(prev => ({
          calories: { ...prev.calories, target: freshTargets.calorieTarget },
          protein: { ...prev.protein, target: freshTargets.protein },
          carbs: { ...prev.carbs, target: freshTargets.carbs },
          fats: { ...prev.fats, target: freshTargets.fats },
          sugar: { ...prev.sugar, target: freshTargets.sugar },
          fiber: { ...prev.fiber, target: freshTargets.fiber }
        }));
        
        await loadConsumptionData();
        return;
      } catch (unifiedError) {
        console.error("Error using unified targets, falling back to legacy method:", unifiedError);
      }
      
      const storedTargetsResponse = await nutrientApi.getNutrientTargets();
      
      if (storedTargetsResponse?.data?.targets) {
        const storedTargets = storedTargetsResponse.data.targets;
        console.log("Fetched stored nutrient targets from database:", storedTargets);
        
        setNutrientGoals(prev => ({
          calories: { ...prev.calories, target: storedTargets.calories },
          protein: { ...prev.protein, target: storedTargets.protein },
          carbs: { ...prev.carbs, target: storedTargets.carbs },
          fats: { ...prev.fats, target: storedTargets.fats },
          sugar: { ...prev.sugar, target: storedTargets.sugar },
          fiber: { ...prev.fiber, target: storedTargets.fiber }
        }));
      }
      
      await loadConsumptionData();
    } catch (error) {
      console.error("Error loading nutritional data:", error);
      
      try {
        const cachedGoals = localStorage.getItem('nutrient_goals');
        if (cachedGoals) {
          const parsedGoals = JSON.parse(cachedGoals);
          const today = new Date().toISOString().split('T')[0];
          
          // Only use cache if it's from today
          if (parsedGoals.date === today) {
            console.log('Using cached nutrient targets as fallback:', parsedGoals.goals);
            setNutrientGoals(prev => ({
              calories: { ...prev.calories, current: parsedGoals.goals.calories.current, target: parsedGoals.goals.calories.target },
              protein: { ...prev.protein, current: parsedGoals.goals.protein.current, target: parsedGoals.goals.protein.target },
              carbs: { ...prev.carbs, current: parsedGoals.goals.carbs.current, target: parsedGoals.goals.carbs.target },
              fats: { ...prev.fats, current: parsedGoals.goals.fats.current, target: parsedGoals.goals.fats.target },
              sugar: { ...prev.sugar, current: parsedGoals.goals.sugar.current, target: parsedGoals.goals.sugar.target },
              fiber: { ...prev.fiber, current: parsedGoals.goals.fiber.current, target: parsedGoals.goals.fiber.target }
            }));
          }
        }
      } catch (cacheError) {
        console.error("Error loading cached nutrient goals:", cacheError);
      }
      
      // Re-throw the original error
      throw error;
    }
  };
  
  // Helper function to load just consumption data
  const loadConsumptionData = async () => {
    try {
      const nutrientResponse = await nutrientApi.getDailyNutrients();
      if (nutrientResponse?.data?.current) {
        const currentConsumption = {
          calories: Number(nutrientResponse.data.current.calories) || 0,
          protein: Number(nutrientResponse.data.current.protein) || 0, 
          carbs: Number(nutrientResponse.data.current.carbs) || 0,
          fats: Number(nutrientResponse.data.current.fats) || 0,
          sugar: Number(nutrientResponse.data.current.sugar) || 0,
          fiber: Number(nutrientResponse.data.current.fiber) || 0
        };
        
        // Update consumption values
        setNutrientGoals(prev => ({
          calories: { ...prev.calories, current: currentConsumption.calories },
          protein: { ...prev.protein, current: currentConsumption.protein },
          carbs: { ...prev.carbs, current: currentConsumption.carbs },
          fats: { ...prev.fats, current: currentConsumption.fats },
          sugar: { ...prev.sugar, current: currentConsumption.sugar },
          fiber: { ...prev.fiber, current: currentConsumption.fiber }
        }));
      }
    } catch (error) {
      console.error("Error loading consumption data:", error);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center mt-12">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-center">Loading Dashboard</CardTitle>
            <CardDescription className="text-center">
              Getting your health data ready...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 py-4">
            <Progress value={75} className="h-2" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show error state
  if (loadingError) {
    return (
      <div className="flex justify-center mt-12">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription className="text-center">
              {loadingError}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center mt-4">
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {typeof user.name === 'string' && user.name !== 'string' ? user.name : user.username || 'User'}!</h1>
        <p className="text-muted-foreground mt-1">Here's your health overview for today</p>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* BMI Chart */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>BMI Measurement</CardTitle>
              <CardDescription>Your current Body Mass Index calculation based on height and weight</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                userApi.clearCache();
                loadDashboardData();
                
                toast({
                  title: "BMI Data Refreshed",
                  description: "Your BMI chart has been updated with the latest data",
                  variant: "default",
                });
              }}
            >
              Refresh BMI
            </Button>
          </CardHeader>
          <CardContent className="h-80">
            {bmiData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={bmiData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" hide={true} />
                  <YAxis domain={[
                    Math.max(15, Math.floor(bmiData[0].bmi) - 5),
                    Math.min(40, Math.ceil(bmiData[0].bmi) + 5)
                  ]} />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'Current BMI']}
                    labelFormatter={() => ''}
                  />
                  {/* Reference lines for healthy BMI range */}
                  <ReferenceLine y={18.5} stroke="green" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: '18.5 - Healthy Min', fill: 'green', fontSize: 12 }} />
                  <ReferenceLine y={25} stroke="orange" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: '25 - Healthy Max', fill: 'orange', fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="bmi"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground">No BMI data available. Please update your height and weight in your profile.</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/profile-form">Update Profile</Link>
                </Button>
              </div>
            )}
          </CardContent>
          {bmiData.length > 0 && (
            <CardFooter className="text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Current BMI:</span> {bmiData[0].bmi}
                <span className={`ml-2 px-2 py-1 rounded-md ${
                  bmiData[0].bmi < 18.5 ? 'bg-yellow-100 text-yellow-800' :
                  bmiData[0].bmi < 25 ? 'bg-green-100 text-green-800' :
                  bmiData[0].bmi < 30 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {bmiData[0].bmi < 18.5 ? 'Underweight' :
                  bmiData[0].bmi < 25 ? 'Healthy Weight' :
                  bmiData[0].bmi < 30 ? 'Overweight' : 'Obese'}
                </span>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Daily Exercise Card */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Exercise</CardTitle>
            <CardDescription>Track your physical activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minutes today</span>
                <span className="text-sm font-medium">{dailyExerciseTotal} / {exerciseGoal} min</span>
              </div>
              <Progress value={exercisePercent} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold mb-2">Log Exercise</h3>
              <div className="flex items-center justify-center">
                <div className="text-4xl font-bold">{exerciseMinutes}</div>
                <div className="ml-2 text-lg">minutes</div>
              </div>
              <div className="flex justify-center space-x-4 mb-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    if (exerciseMinutes > 0) {
                      setExerciseMinutes(exerciseMinutes - 5);
                    }
                  }}
                  disabled={exerciseMinutes <= 0}
                >
                  -
                </Button>
                <input
                  type="number"
                  className="w-16 text-center border rounded-md"
                  value={exerciseMinutes}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      setExerciseMinutes(value);
                    }
                  }}
                  min="0"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setExerciseMinutes(exerciseMinutes + 5)}
                >
                  +
                </Button>
              </div>
              <Button 
                className="w-full"
                onClick={async () => {
                  if (exerciseMinutes <= 0) {
                    toast({
                      title: "Error",
                      description: "Exercise minutes must be positive",
                      variant: "destructive",
                    });
                    return;
                  }

                  console.log(`Logging exercise: ${exerciseMinutes} minutes with replace_daily_total=false`);

                  const exerciseData = {
                    activity_type: "General Exercise",
                    duration: exerciseMinutes,
                    timestamp: new Date().toISOString(),
                    replace_daily_total: false 
                  };
                  
                  toast({
                    title: "Logging exercise...",
                    description: "Please wait while we update your exercise log.",
                    variant: "default",
                  });
                  
                  try {

                    console.log("Making API call to log exercise...");
                    const response = await exerciseApi.logExercise(exerciseData);
                    console.log("Exercise log API response:", response);
                    
                    const expectedNewTotal = dailyExerciseTotal + exerciseMinutes;
                    console.log(`Temporarily updating UI with expected new total: ${expectedNewTotal} minutes`);
                    updateExerciseDisplay(expectedNewTotal, true);
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    try {
                      console.log("Refreshing exercise data from history after logging...");
                      await loadExerciseDataFromHistory();
                      
                      const today = new Date().toISOString().split('T')[0]; 
                      localStorage.setItem('last_exercise_date', today);
                    } catch (verifyError) {
                      console.error('Error refreshing exercise data:', verifyError);
                      
                      try {
                        console.log("Falling back to getDaily API...");
                        const updatedResponse = await exerciseApi.getDaily({ forceRefresh: true });
                        
                        if (updatedResponse && updatedResponse.data) {
                          const backendTotalMinutes = updatedResponse.data.total_minutes;
                          console.log(`Backend returned total exercise minutes: ${backendTotalMinutes}`);
                          
                          updateExerciseDisplay(backendTotalMinutes, true);
                          
                          setExerciseGoal(updatedResponse.data.goal_minutes || 30);
                        }
                      } catch (dailyError) {
                        console.error('Error with fallback to getDaily:', dailyError);
                      }
                    }
                    
                    toast({
                      title: "Exercise logged",
                      description: `Added ${exerciseMinutes} minutes to today's exercise`,
                      variant: "success",
                    });
                  } catch (error) {
                    console.error('Error logging exercise:', error);
                    const errorDetails = handleApiError(error, 'Failed to save exercise data');
                    toast({
                      title: "Error", 
                      description: errorDetails.message,
                      variant: "destructive",
                    });
                  }
                }}
              >
                Log Exercise
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/health-page?tab=exercise">View Exercise History</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Water Intake Card */}
        <Card>
          <CardHeader>
            <CardTitle>Water Intake</CardTitle>
            <CardDescription>Track your daily hydration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="text-5xl font-bold">{waterGlasses}</div>
              <div className="ml-2 text-lg">glasses</div>
            </div>
            <div className="flex justify-center space-x-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleWaterDecrement}
                disabled={waterGlasses <= 0}
              >
                -
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleWaterIncrement}
              >
                +
              </Button>
            </div>
            <Button 
              className="w-full"
              onClick={() => {
                const waterData = {
                  glasses: waterGlasses,
                  date: new Date().toISOString().split('T')[0]
                };
                
                waterApi.logWater(waterData)
                  .then(response => {
                    toast({
                      title: "Water intake saved",
                      description: `You've logged ${waterGlasses} glasses of water`,
                      variant: "success",
                    });
                  })
                  .catch(error => {
                    console.error('Error logging water intake:', error);
                    const errorDetails = handleApiError(error, 'Failed to save water intake');
                    toast({
                      title: "Error", 
                      description: errorDetails.message,
                      variant: "destructive",
                    });
                  });
              }}
            >
              Log Water Intake
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <div className="text-center text-sm text-muted-foreground w-full">
              Aim for 8 glasses per day
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/meal-log?tab=water-intake">View Consumption Log</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Nutrient Goals Card */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Today's Nutrient Goals</CardTitle>
            <CardDescription>Based on today's logged meals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show message if no targets are set yet */}
            {Object.values(nutrientGoals).every(goal => goal.target === 0) ? (
              <div className="text-center text-muted-foreground py-6">
                <p className="mb-2">Nutritional targets not yet available.</p>
                <p className="text-sm">Please complete your profile to calculate personalized targets.</p>
              </div>
            ) : (
              Object.entries(nutrientGoals).map(([nutrient, goalData]) => {
                const current = goalData.current !== undefined ? goalData.current : 0;
                const target = goalData.target !== undefined ? goalData.target : 0;
                const unit = goalData.unit || (nutrient === 'calories' ? 'kcal' : 'g');
                
                return (
                  <div key={nutrient} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm capitalize">{nutrient}</span>
                      <span className="text-sm font-medium">
                        {roundNutrientValue(current)} / {roundNutrientValue(target)} {unit}
                      </span>
                    </div>
                    <Progress value={calculateProgress(current, target)} className="nutrient-progress" />
                  </div>
                );
              })
            )}
            {/* Show meals logged message */}
            {!Object.values(nutrientGoals).every(goal => goal.target === 0) && 
             Object.values(nutrientGoals).every(goal => goal.current === 0) && (
              <div className="text-center text-muted-foreground py-2">
                <p>No meals logged yet today.</p>
                <p className="text-sm mt-1">Log your first meal to see your progress!</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/meal-log">Log a Meal</Link>
            </Button>
            <div className="relative group">
              <Button 
                onClick={() => updateNutritionalTargets(true)}
                variant="outline"
                size="sm"
                className="h-8 gap-1 w-full"
                disabled={isApiCallInProgress || !userData || !userData.height || !userData.weight || !userData.date_of_birth}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Recalculate</span>
              </Button>
              {(!userData || !userData.height || !userData.weight || !userData.date_of_birth) && (
                <div className="absolute -top-10 left-0 right-0 mx-auto w-64 invisible group-hover:visible bg-black bg-opacity-80 text-white text-xs rounded py-1 px-2 text-center transition-opacity">
                  Complete your profile to access this feature
                </div>
              )}
            </div>
            {Object.values(nutrientGoals).every(goal => goal.target === 0) && (
              <Button 
                variant="default"
                size="sm" 
                className="w-full text-xs mt-1"
                asChild
              >
                <Link to="/profile">Complete Profile</Link>
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Last Meal Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
            <CardTitle>Last Meal</CardTitle>
            <CardDescription>
              {lastMeal ? `Logged ${lastMeal.time}` : 'No meals logged yet'}
            </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                fetchLastMeal();
                toast({
                  title: "Refreshed",
                  description: "Last meal data refreshed",
                  variant: "default",
                });
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          {lastMeal ? (
            <CardContent className="space-y-4">
              <div className="text-lg font-medium">{lastMeal.name}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Calories: <span className="font-medium">{roundNutrientValue(lastMeal.calories)} kcal</span></div>
                <div>Protein: <span className="font-medium">{roundNutrientValue(lastMeal.protein)}g</span></div>
                <div>Carbs: <span className="font-medium">{roundNutrientValue(lastMeal.carbs)}g</span></div>
                <div>Fats: <span className="font-medium">{roundNutrientValue(lastMeal.fats)}g</span></div>
                {lastMeal.sugar > 0 && (
                  <div>Sugar: <span className="font-medium">{roundNutrientValue(lastMeal.sugar)}g</span></div>
                )}
                {lastMeal.fiber > 0 && (
                  <div>Fiber: <span className="font-medium">{roundNutrientValue(lastMeal.fiber)}g</span></div>
                )}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <div className="text-center py-4 text-muted-foreground">
                No meal data available. Start logging your meals to see information here.
              </div>
            </CardContent>
          )}
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/meal-log">View Meal History</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Health Card */}
        <Card>
          <CardHeader>
            <CardTitle>Health Overview</CardTitle>
            <CardDescription>Your health insights</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className={`inline-block px-4 py-2 rounded-full text-lg font-medium ${
              healthStatus === 'Healthy' ? 'bg-green-100 text-green-800' :
              healthStatus === 'At Risk' ? 'bg-yellow-100 text-yellow-800' :
              healthStatus === 'Needs Attention' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {healthStatus || 'Get Health Analysis'}
            </div>
            <p className="mt-4 text-muted-foreground">
              {healthStatus === 'Healthy' ? 'Keep up the good work!' :
               healthStatus === 'At Risk' ? 'Some lifestyle changes recommended' :
               healthStatus === 'Needs Attention' ? 'Please consult a healthcare professional' :
               'Complete your health profile for personalized insights'}
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/health-page">View Health Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;