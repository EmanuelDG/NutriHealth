import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { healthApi, exerciseApi, userApi, mealApi, handleApiError } from '../services/api';
import { useToast } from "../components/ui/use-toast";
import { 
  Activity, ActivitySquare, AlertCircle, AlertTriangle, Heart, Info, TrendingUp, ArrowUpCircle, 
  ShieldAlert, Shield, Apple, Brain, Utensils, MessageSquare, LinkIcon, Scale, Trash2, Droplets, 
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';


const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

const roundNutrientValue = (value) => {
  if (typeof value !== 'number') return value;
  return Math.round(value * 10) / 10;
};

const HealthPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [healthHistory, setHealthHistory] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [nutrientData, setNutrientData] = useState(null);
  const [exerciseData, setExerciseData] = useState(null);
  const [hasLoggedMeals, setHasLoggedMeals] = useState(false);
  const [ageBasedThresholds, setAgeBasedThresholds] = useState([]);
  const [diseaseGuidelines, setDiseaseGuidelines] = useState([]);
  const [userHasConditions, setUserHasConditions] = useState(false);
  

  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(5);
  const [isDeletingExercise, setIsDeletingExercise] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);
  
  const lastRefreshRef = useRef(Date.now());
  const MIN_REFRESH_INTERVAL = 30000; // 30 seconds
  const currentDaysRef = useRef(7); // Default days value

  const [exerciseMinutes, setExerciseMinutes] = useState(0);
  const [isLoggingExercise, setIsLoggingExercise] = useState(false);
  
  const exerciseDataLoadedRef = useRef(false);
  
  const loadExerciseData = async () => {
    try {
      console.log('Loading exercise data from database...');
      
      const today = new Date().toISOString().split('T')[0];
      const historyResponse = await exerciseApi.getHistory(1, true);
      
      const todaysEntries = historyResponse.data ? historyResponse.data.filter(entry => {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        return entryDate === today;
      }) : [];
      
      console.log(`Found ${todaysEntries.length} entries for today from database`);
      
      const totalMinutes = todaysEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      const goalMinutes = 30;
      
      console.log(`Calculated total minutes directly from database: ${totalMinutes}`);
      
      setExerciseData({
        minutes: totalMinutes,
        goal: goalMinutes,
        percent: Math.min(Math.round((totalMinutes / goalMinutes) * 100), 100)
      });
      
      try {
        await exerciseApi.getDaily({ forceRefresh: true });
      } catch (dailyError) {
        console.error('Error fetching daily totals (non-critical):', dailyError);
      }
    } catch (exerciseError) {
      console.error('Error fetching exercise data:', exerciseError);
      setExerciseData({
        minutes: 0,
        goal: 30,
        percent: 0
      });
    }
  };

  const fetchExerciseHistory = useCallback(async (days = 7) => {
    currentDaysRef.current = days;
    
    setIsLoadingHistory(true);
    setVisibleHistoryCount(5);
    try {
      const response = await exerciseApi.getHistory(days);
      if (response.data) {
        const sortedHistory = response.data.sort((a, b) => {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        setExerciseHistory(sortedHistory);
        
        return sortedHistory;
      }
      return [];
    } catch (error) {
      console.error('Error fetching exercise history:', error);
      const errorDetails = handleApiError(error, "Failed to load exercise history");
      toast({
        title: "Error",
        description: errorDetails?.message || "Failed to load exercise history",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, [toast]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "exercise", "history"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
      
    loadExerciseData();
    fetchExerciseHistory(currentDaysRef.current);
    
  }, [searchParams, fetchExerciseHistory]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page is now visible, refreshing exercise data');
        loadExerciseData();
        fetchExerciseHistory(currentDaysRef.current);
      }
    };
    
    const handleFocus = () => {
      console.log('Window focused, refreshing exercise data');
      loadExerciseData();
      fetchExerciseHistory(currentDaysRef.current);
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchExerciseHistory]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await userApi.getProfile({ forceRefresh: true });
        const user = response.data;
        
        const hasConditions = user.heart_disease || user.diabetes;
        setUserHasConditions(hasConditions);
        
        if (user.date_of_birth) {
          const today = new Date();
          const birthDate = new Date(user.date_of_birth);
          const calculatedAge = today.getFullYear() - birthDate.getFullYear();
          
          const hasBirthdayOccurredThisYear = 
            today.getMonth() > birthDate.getMonth() || 
            (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
            
          const finalAge = hasBirthdayOccurredThisYear ? calculatedAge : calculatedAge - 1;
          
          user.age = finalAge;
        }
        
        if (hasConditions) {
          const guidelines = [];
          if (user.heart_disease) {
            guidelines.push("Limit sodium intake to less than 2,300mg per day");
            guidelines.push("Focus on heart-healthy fats like omega-3s from fish and olive oil");
          }
          if (user.diabetes) {
            guidelines.push("Monitor carbohydrate intake and choose foods with low glycemic index");
            guidelines.push("Aim for consistent meal timing to maintain stable blood glucose");
          }
          if (user.high_blood_pressure) {
            guidelines.push("Follow the DASH diet (Dietary Approaches to Stop Hypertension)");
            guidelines.push("Reduce caffeine consumption");
          }
          setDiseaseGuidelines(guidelines);
        }
        
        // Set age-based thresholds based on user age
        if (user.date_of_birth) {
          const today = new Date();
          const birthDate = new Date(user.date_of_birth);
          const age = today.getFullYear() - birthDate.getFullYear();
          
          if (age < 30) {
            setAgeBasedThresholds([
              { name: 'Calories', value: '2000-2800 kcal/day', description: 'Based on moderate activity level' },
              { name: 'Protein', value: '0.8g per kg of body weight', description: 'Higher for active individuals' },
              { name: 'Fiber', value: '25-35g per day', description: 'Important for digestive health' }
            ]);
          } else if (age < 50) {
            setAgeBasedThresholds([
              { name: 'Calories', value: '1800-2400 kcal/day', description: 'Based on moderate activity level' },
              { name: 'Protein', value: '1.0g per kg of body weight', description: 'Increase with activity level' },
              { name: 'Fiber', value: '25-30g per day', description: 'Important for heart health' }
            ]);
          } else {
            setAgeBasedThresholds([
              { name: 'Calories', value: '1600-2200 kcal/day', description: 'Based on moderate activity level' },
              { name: 'Protein', value: '1.0-1.2g per kg of body weight', description: 'Higher to maintain muscle mass' },
              { name: 'Fiber', value: '20-30g per day', description: 'Important for digestive and heart health' }
            ]);
          }
        }
        
        setUserData(user);
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    
    loadUserData();
  }, []); 

  const dataLoadedRef = useRef(false);
  
  useEffect(() => {
    if (isRequestInProgress || dataLoadedRef.current) {
      return;
    }
    
    const loadHealthData = async () => {
      try {
        setIsRequestInProgress(true);
        setIsLoading(true);
        dataLoadedRef.current = true;
        

        await refreshDashboardData(true);
        
        await loadExerciseData();
        
        try {
          const mealResponse = await mealApi.hasMealsToday();
          if (mealResponse.data) {
            setHasLoggedMeals(mealResponse.data.has_meals);
          }
        } catch (mealError) {
          console.error('Error checking meals logged today:', mealError);
          setHasLoggedMeals(false);
        }
        
        setIsLoading(false);
        setIsRequestInProgress(false);
      } catch (error) {
        console.error('Error loading health data:', error);
        setIsLoading(false);
        setIsRequestInProgress(false);
        
        toast({
          title: "Error",
          description: "Failed to load health data. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    loadHealthData();
  }, [toast]);

  const refreshDashboardData = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) {
      console.log('Throttling dashboard refresh, too soon since last refresh');
      return;
    }
    
    lastRefreshRef.current = now;
    
    try {
      const healthResponse = await healthApi.getStatus();
      setHealthData(healthResponse.data);
      
      // Fetch health history (last 3 records)
      try {
        const historyResponse = await healthApi.getHealthHistory(3);
        if (historyResponse.data && Array.isArray(historyResponse.data)) {
          setHealthHistory(historyResponse.data);
        }
      } catch (historyError) {
        console.error('Error fetching health history:', historyError);
      }
      
      try {
        const nutrientResponse = await healthApi.getDailyNutrients();
        if (nutrientResponse.data) {
          const { current, target, percent } = nutrientResponse.data;
          setNutrientData({
            calories: { 
              current: Math.round(current.calories || 0), 
              target: Math.round(target.calories || 2000),
              percent: percent.calories || 0
            },
            protein: { 
              current: Math.round(current.protein || 0), 
              target: Math.round(target.protein || 50),
              percent: percent.protein || 0
            },
            carbs: { 
              current: Math.round(current.carbs || 0), 
              target: Math.round(target.carbs || 250),
              percent: percent.carbs || 0
            },
            fats: { 
              current: Math.round(current.fats || 0), 
              target: Math.round(target.fats || 70),
              percent: percent.fats || 0
            },
            fiber: { 
              current: Math.round(current.fiber || 0), 
              target: Math.round(target.fiber || 25),
              percent: percent.fiber || 0
            }
          });
        }
      } catch (error) {
        console.error('Error refreshing nutrient data:', error);
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      throw error;
    }
  };

  const debouncedRefresh = useDebounce(refreshDashboardData, 1000);

  const updateHealthClassification = async () => {
    if (isUpdating) return; 
    
    try {
      setIsUpdating(true);
      
      // Call the API with the required parameters
      const response = await healthApi.classifyHealth({
        update_health_status: true,
        include_insights: true
      });
      
      healthApi.clearStatusCache();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await refreshDashboardData(true);
      
      toast({
        title: "Health Status Updated",
        description: "Your health classification has been refreshed."
      });
    } catch (error) {
      console.error('Error updating health classification:', error);
      const errorDetails = handleApiError(error, "Failed to update health status");
      toast({
        title: "Error",
        description: errorDetails?.message || "Failed to update health status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const getHealthStatusInfo = (classification) => {
    switch (classification) {
      case 'Healthy':
        return { 
          icon: <Shield className="h-6 w-6 text-green-500" />,
          color: 'bg-green-100 text-green-800',
          colorClass: 'text-green-500',
          description: 'Your health indicators are in good ranges.'
        };
      case 'At Risk':
        return { 
          icon: <ShieldAlert className="h-6 w-6 text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-800',
          colorClass: 'text-yellow-500',
          description: 'Some health indicators need attention.'
        };
      case 'Needs Attention':
        return {
          icon: <AlertCircle className="h-6 w-6 text-red-500" />,
          color: 'bg-red-100 text-red-800',
          colorClass: 'text-red-500',
          description: 'Several health indicators require attention.'
        };
      case 'Unknown':
      default:
        return {
          icon: <Info className="h-6 w-6 text-blue-500" />,
          color: 'bg-blue-100 text-blue-800',
          colorClass: 'text-blue-500',
          description: 'Click "Update Health Classification" to analyze your health status based on your profile data.'
        };
    }
  };
  
  // Helper function for BMI category
  const getBmiCategory = (bmi) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Healthy Weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };
  
  // Helper function for BMI color
  const getBmiColor = (bmi) => {
    if (bmi < 18.5) return 'bg-yellow-500';
    if (bmi < 25) return 'bg-green-500';
    if (bmi < 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getBmiProgressColor = (bmi) => {
    if (bmi < 18.5) return 'yellow';
    if (bmi < 25) return 'green';
    if (bmi < 30) return 'yellow';
    return 'red';
  };

  const logExercise = async () => {
    if (exerciseMinutes <= 0) {
      toast({
        title: "Error",
        description: "Exercise minutes must be positive",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoggingExercise(true);
      
      console.log(`Logging exercise: ${exerciseMinutes} minutes with replace_daily_total=false`);
      
      const exerciseSendData = {
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
      
      const currentTotal = exerciseData?.minutes || 0;
      const expectedNewTotal = currentTotal + exerciseMinutes;
      const goalMinutes = exerciseData?.goal || 30;
      const expectedPercent = Math.min(Math.round((expectedNewTotal / goalMinutes) * 100), 100);
      
      setExerciseData({
        minutes: expectedNewTotal,
        goal: goalMinutes,
        percent: expectedPercent
      });
      
      console.log("Making API call to log exercise...");
      await exerciseApi.logExercise(exerciseSendData);

      await loadExerciseData();
      
      await fetchExerciseHistory(currentDaysRef.current);
      
      setExerciseMinutes(0);
      
      toast({
        title: "Success",
        description: "Exercise logged successfully",
        variant: "success",
      });
    } catch (error) {
      console.error('Error logging exercise:', error);
      const errorDetails = handleApiError(error, "Failed to log exercise");
      toast({
        title: "Error",
        description: errorDetails?.message || "Failed to log exercise",
        variant: "destructive",
      });
    } finally {
      setIsLoggingExercise(false);
    }
  };

  // Handlers for exercise history period buttons
  const handle7DaysClick = useCallback(() => {
    fetchExerciseHistory(7);
  }, [fetchExerciseHistory]);
  
  const handle30DaysClick = useCallback(() => {
    fetchExerciseHistory(30);
  }, [fetchExerciseHistory]);
  
  const handle90DaysClick = useCallback(() => {
    fetchExerciseHistory(90);
  }, [fetchExerciseHistory]);


  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const deleteExercise = async (exerciseId) => {
    if (isDeletingExercise) return;
    
    try {
      setIsDeletingExercise(true);
      setSelectedDeleteId(exerciseId);
      
      console.log(`Deleting exercise log with ID: ${exerciseId}`);
      
      await exerciseApi.deleteExercise(exerciseId);
      
      // Get the current history list, filter out the deleted item
      setExerciseHistory(prev => prev.filter(item => item.id !== exerciseId));
      
      // Reload the exercise data
      await loadExerciseData();
      
      toast({
        title: "Success",
        description: "Exercise log deleted successfully",
        variant: "success",
      });
    } catch (error) {
      console.error('Error deleting exercise log:', error);
      const errorDetails = handleApiError(error, "Failed to delete exercise log");
      toast({
        title: "Error",
        description: errorDetails?.message || "Failed to delete exercise log",
        variant: "destructive",
      });
    } finally {
      setIsDeletingExercise(false);
      setSelectedDeleteId(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Health Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="exercise">Exercise</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Health Overview</CardTitle>
              <CardDescription>Your current health status and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              ) : healthData ? (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    {getHealthStatusInfo(healthData.classification).icon}
                    <div className="text-sm text-muted-foreground mb-1 flex items-center justify-center">
                      <span className="inline-flex items-center justify-center rounded-full border h-5 w-5 text-xs mr-1">{<Info className="h-3 w-3" />}</span>
                      MODEL OUTPUT
                    </div>
                    <div className={`inline-block px-4 py-2 rounded-full text-lg font-medium mt-2 ${
                      getHealthStatusInfo(healthData.classification).color
                    }`}>
                      {healthData.classification || 'Unknown'}
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {getHealthStatusInfo(healthData.classification).description}
                    </p>
                    {(healthData.classification === 'At Risk' || healthData.classification === 'Healthy') && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        Properly tracking progress is vital for Health classification accuracy.
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center mb-2">
                        <Heart className="h-5 w-5 mr-2 text-red-500" />
                        <h3 className="font-medium">Last Classification</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(healthData.date).toLocaleString()}
                      </p>
                    </div>
                    {userData && (
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center mb-2">
                          <Activity className="h-5 w-5 mr-2 text-blue-500" />
                          <h3 className="font-medium">BMI</h3>
                        </div>
                        {userData.height && userData.weight ? (
                          <div>
                            <p className="text-sm font-medium">
                              {(userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1)} - {
                                getBmiCategory(userData.weight / Math.pow(userData.height / 100, 2))
                              }
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                              <div 
                                className={`h-2.5 rounded-full ${getBmiColor(userData.weight / Math.pow(userData.height / 100, 2))}`}
                                style={{ 
                                  width: `${Math.min(((userData.weight / Math.pow(userData.height / 100, 2)) / 40) * 100, 100)}%`,
                                  transition: 'width 0.5s ease-in-out'
                                }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Update your height and weight to see BMI
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {userData && (
                    <div className="mt-4">
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center mb-2">
                          <Scale className="h-5 w-5 mr-2 text-purple-500" />
                          <h3 className="font-medium">Weight</h3>
                        </div>
                        <p className="text-sm font-medium">{userData.weight} kg</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Update Health Classification Button */}
                  <div className="mt-4">
                    <div className="relative group">
                      <Button 
                        onClick={updateHealthClassification}
                        className="w-full"
                        disabled={isUpdating || !userData || !userData.height || !userData.weight || !userData.age}
                      >
                        {isUpdating ? "Updating..." : "Update Health Classification"}
                      </Button>
                      {(!userData || !userData.height || !userData.weight || !userData.age) && (
                        <div className="absolute -top-10 left-0 right-0 mx-auto w-64 invisible group-hover:visible bg-black bg-opacity-80 text-white text-xs rounded py-1 px-2 text-center transition-opacity">
                          Complete your profile to access this feature
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Meal Logging Reminder */}
                  <div className="rounded-lg border p-4 bg-blue-50">
                    <div className="flex items-center mb-2">
                      <Utensils className="h-5 w-5 mr-2 text-blue-500" />
                      <h3 className="font-medium">Meal Tracking</h3>
                    </div>
                    <p className="text-sm mb-2">
                      {hasLoggedMeals ? 
                        "You've logged meals today. Great job!" : 
                        "You haven't logged any meals today."}
                    </p>
                    <Link to="/meal-log">
                      <Button variant="outline" size="sm" className="w-full">
                        {hasLoggedMeals ? "Log Another Meal" : "Log Your Meals"}
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Progress Bars for Nutrients & Exercise */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Daily Progress</h3>
                    
                    {nutrientData && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Calories</span>
                            <span>{roundNutrientValue(nutrientData.calories.current)} / {roundNutrientValue(nutrientData.calories.target)} kcal</span>
                          </div>
                          <Progress value={nutrientData.calories.percent} />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Protein</span>
                            <span>{roundNutrientValue(nutrientData.protein.current)} / {roundNutrientValue(nutrientData.protein.target)}g</span>
                          </div>
                          <Progress value={nutrientData.protein.percent} className="bg-blue-200" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Carbohydrates</span>
                            <span>{roundNutrientValue(nutrientData.carbs.current)} / {roundNutrientValue(nutrientData.carbs.target)}g</span>
                          </div>
                          <Progress value={nutrientData.carbs.percent} className="bg-yellow-200" />
                        </div>
                      </>
                    )}
                    
                    {exerciseData && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Physical Activity</span>
                          <span>{exerciseData.minutes} / {exerciseData.goal} minutes</span>
                        </div>
                        <Progress 
                          value={exerciseData.percent} 
                          className="bg-green-200"
                          key={`exercise-progress-overview-${exerciseData.minutes}`}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Health Condition Guidelines - MOVED FROM HEALTH DETAILS TAB */}
                  {userHasConditions && diseaseGuidelines.length > 0 && (
                    <div className="rounded-lg border p-4 bg-amber-50 mt-4">
                      <div className="flex items-center mb-2">
                        <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                        <h3 className="font-medium">Health Condition Guidelines</h3>
                      </div>
                      <ul className="space-y-2 mt-2">
                        {diseaseGuidelines.map((guideline, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xs mr-2">•</span>
                            <span>{guideline}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="mb-2">No health data available yet.</p>
                  <p className="text-sm text-muted-foreground">Complete your profile to get health insights.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="exercise" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Exercise Tracking</CardTitle>
              <CardDescription>Track and monitor your physical activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-lg border">
                <h3 className="text-xl font-semibold mb-4">Daily Exercise Log</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Minutes today</span>
                      <span className="text-sm font-medium">
                        {exerciseData ? exerciseData.minutes : 0} / {exerciseData ? exerciseData.goal : 30} min
                      </span>
                    </div>
                    <Progress 
                      value={exerciseData ? exerciseData.percent : 0} 
                      className="h-2"
                      key={`exercise-progress-${exerciseData ? exerciseData.minutes : 0}`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold mb-2">Log Exercise</h4>
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
                      onClick={logExercise}
                      disabled={isLoggingExercise || exerciseMinutes <= 0}
                    >
                      {isLoggingExercise ? "Logging..." : "Log Exercise"}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Exercise History</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-100 p-4 font-medium">
                    <div className="grid grid-cols-4">
                      <div>Date</div>
                      <div>Duration</div>
                      <div>Activity Type</div>
                      <div className="text-right">Action</div>
                    </div>
                  </div>
                  <div className="divide-y">
                    {isLoadingHistory ? (
                      <div className="p-4 text-center">Loading exercise history...</div>
                    ) : exerciseHistory.length > 0 ? (
                      <>
                        {exerciseHistory.slice(0, visibleHistoryCount).map((entry, index) => (
                          <div key={index} className="p-4 grid grid-cols-4">
                            <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
                            <div>{entry.duration} minutes</div>
                            <div>{entry.activity_type || "General Exercise"}</div>
                            <div className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteExercise(entry.id)}
                                disabled={isDeletingExercise && selectedDeleteId === entry.id}
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                title="Delete exercise log"
                              >
                                {isDeletingExercise && selectedDeleteId === entry.id ? (
                                  <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                        {exerciseHistory.length > visibleHistoryCount && (
                          <div className="p-4 text-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const increment = 5;
                                const newCount = Math.min(visibleHistoryCount + increment, exerciseHistory.length);
                                setVisibleHistoryCount(newCount);
                              }}
                            >
                              Show More ({Math.min(exerciseHistory.length - visibleHistoryCount, 5)} more entries)
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        <Info className="h-4 w-4 inline-block mr-2" />
                        No exercise history found. Start logging your daily activities!
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handle7DaysClick}
                  >
                    Last 7 Days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handle30DaysClick}
                  >
                    Last 30 Days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handle90DaysClick}
                  >
                    Last 90 Days
                  </Button>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Exercise Benefits</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-500 text-xs mr-2">•</span>
                      <span>Regular exercise improves cardiovascular health and reduces risk of heart disease</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-500 text-xs mr-2">•</span>
                      <span>Physical activity helps maintain healthy weight and boosts metabolism</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-500 text-xs mr-2">•</span>
                      <span>Exercise releases endorphins, improving mood and reducing stress</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Health History</CardTitle>
              <CardDescription>View your health trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ) : healthData ? (
                <div>
                  <p className="mb-4">Your health classification history:</p>
                  
                  {healthHistory.length > 0 ? (
                    <div className="space-y-4">
                      {healthHistory.slice(0, 3).map((status, index) => (
                        <div key={status.id || index} className="rounded-lg border p-4">
                          <div className="flex items-center mb-3">
                            {getHealthStatusInfo(status.classification).icon}
                            <h3 className="font-medium ml-2">{status.classification}</h3>
                            <span className="ml-auto text-sm text-muted-foreground">
                              {new Date(status.date).toLocaleDateString()} {new Date(status.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getHealthStatusInfo(status.classification).description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border p-4 mb-8">
                      <div className="flex items-center mb-3">
                        {getHealthStatusInfo(healthData.classification).icon}
                        <h3 className="font-medium ml-2">{healthData.classification}</h3>
                        <span className="ml-auto text-sm text-muted-foreground">
                          {new Date(healthData.date).toLocaleDateString()} {new Date(healthData.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-blue-50 rounded-lg mt-4">
                    <div className="flex items-center">
                      <Info className="h-4 w-4 mr-2 text-blue-500" />
                      <p className="text-sm">
                        Regular health status updates help track changes in your health over time. Your last 3 classifications are shown above.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button
                      className="w-full"
                      onClick={updateHealthClassification}
                      disabled={isUpdating || !userData || !userData.height || !userData.weight || !userData.age}
                    >
                      {isUpdating ? "Updating..." : "Update Health Classification"}
                    </Button>
                    {(!userData || !userData.height || !userData.weight || !userData.age) && (
                      <div className="text-sm text-muted-foreground mt-2 text-center">
                        Complete your profile to access this feature
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p>No health history available yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Your health history will appear here once you receive your first classification.</p>
                  
                  <Button
                    className="mt-4"
                    onClick={updateHealthClassification}
                    disabled={isUpdating || !userData || !userData.height || !userData.weight || !userData.age}
                  >
                    {isUpdating ? "Updating..." : "Get Health Classification"}
                  </Button>
                  {(!userData || !userData.height || !userData.weight || !userData.age) && (
                    <div className="text-sm text-muted-foreground mt-2 text-center">
                      Complete your profile to access this feature
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HealthPage;