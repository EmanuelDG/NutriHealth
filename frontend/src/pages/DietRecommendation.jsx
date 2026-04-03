import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ThumbsDown,
  RefreshCw,
  Utensils,
  Star,
  List,
  Heart,
  Clock3,
  Leaf,
  BarChart3
} from 'lucide-react';
import { Separator } from '../components/ui/separator';
import { useToast } from '../components/ui/use-toast';
import { recommendationApi, mealApi, userApi, healthApi, calculateNutritionalTargets, syncNutritionalTargets, getUnifiedNutrientTargets } from '../services/api';
import LogMealPopup from '../components/features/LogMealPopup';

// Utility function to round nutrient values for display
const roundNutrientValue = (value) => {
  if (typeof value !== 'number') return value;
  return Math.round(value * 10) / 10;
};

const DietRecommendation = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isInitialMount = useRef(true);
  const requestInProgress = useRef(false);
  
  // State management
  const [dietaryPreferences, setDietaryPreferences] = useState({
    restrictions: [],
    allergies: [],
    calorieTarget: 0,
    macroTargets: {
      protein: 0,
      carbs: 0,
      fats: 0
    }
  });
  const [mealSuggestions, setMealSuggestions] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logMealPopup, setLogMealPopup] = useState({ isOpen: false, success: false, mealName: "" });
  const [userData, setUserData] = useState(null);
  
  // Function to fetch recommendations from API - defined BEFORE useEffect
  const fetchRecommendations = useCallback(async () => {
    // Prevent concurrent requests
    if (requestInProgress.current) {
      console.log("Request already in progress, skipping duplicate call");
      return;
    }
    
    requestInProgress.current = true;
    setIsLoading(true);
    
    try {
      // Call the API to get recommendations
      console.log("Fetching recommendations...");
      toast({
        title: "Loading Recommendations",
        description: "Please wait while we fetch your personalized meal suggestions...",
        duration: 5000,
      });
      
      const response = await recommendationApi.getRecommendations(3, false);
      console.log("API response received");
      
      if (response.data && response.data.length > 0) {
        // Transform API response to the format our component expects
        const formattedMeals = response.data.map(recommendation => {
          // Parse ingredients and instructions from recipe
          let recipeText = recommendation.recipe || '';
          console.log(`Processing recommendation: ${recommendation.id}, ${recommendation.meal_name}`);
          
          // Try to parse as JSON first in case it's a serialized JSON object
          try {
            const jsonRecipe = JSON.parse(recipeText);
            if (typeof jsonRecipe === 'object') {
              // Handle structured JSON format if API returns it that way
              if (jsonRecipe.ingredients && jsonRecipe.instructions) {
                const ingredients = Array.isArray(jsonRecipe.ingredients) 
                  ? jsonRecipe.ingredients
                  : [jsonRecipe.ingredients];
                  
                const instructions = Array.isArray(jsonRecipe.instructions)
                  ? jsonRecipe.instructions
                  : [jsonRecipe.instructions];
                  
                return {
                  id: recommendation.id,
                  name: recommendation.meal_name,
                  calories: recommendation.calories || 0,
                  prepTime: recommendation.prep_time || 15,
                  cookTime: recommendation.cook_time || 20,
                  healthImpactScore: recommendation.nutrient_score || 0,
                  macros: {
                    protein: recommendation.protein || 0,
                    carbs: recommendation.carbs || 0,
                    fats: recommendation.fats || 0,
                    fiber: recommendation.fiber || 0
                  },
                  ingredients: ingredients.map(item => typeof item === 'string' ? item : JSON.stringify(item)),
                  instructions: instructions.map(item => typeof item === 'string' ? item : JSON.stringify(item)),
                  benefits: [
                    `Overall nutrient score: ${recommendation.nutrient_score}/100`,
                    recommendation.health_benefits || "Balanced macronutrient profile"
                  ]
                };
              }
            }
          } catch (e) {
            // Not JSON, continue with text parsing
            console.log('Recipe is not in JSON format, continuing with text parsing');
          }
          
          // Standard text format parsing
          const ingredientsMatch = recipeText.match(/Ingredients:([\s\S]*?)Instructions:/);
          const instructionsMatch = recipeText.match(/Instructions:([\s\S]*)/);
          
          const ingredientsText = ingredientsMatch ? ingredientsMatch[1].trim() : '';
          const instructionsText = instructionsMatch ? instructionsMatch[1].trim() : '';
          
          // Parse ingredients into array
          const ingredients = ingredientsText
            .split('\n')
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(line => line.length > 0);
          
          // Parse instructions into array
          const instructions = instructionsText
            .split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0);
          
          // Generate health benefits based on nutrient score
          const benefits = [
            `Overall nutrient score: ${recommendation.nutrient_score}/100`,
            recommendation.health_benefits || "Balanced macronutrient profile"
          ];
          
          return {
            id: recommendation.id,
            name: recommendation.meal_name,
            calories: recommendation.calories || 0,
            prepTime: recommendation.prep_time || 15,
            cookTime: recommendation.cook_time || 20,
            healthImpactScore: recommendation.nutrient_score || 0,
            macros: {
              protein: recommendation.protein || 0,
              carbs: recommendation.carbs || 0,
              fats: recommendation.fats || 0,
              fiber: recommendation.fiber || 0
            },
            ingredients: ingredients,
            instructions: instructions,
            benefits: benefits
          };
        });
        
        console.log(`Processed ${formattedMeals.length} recommendations:`, formattedMeals.map(m => m.name));
        setMealSuggestions(formattedMeals);
        if (formattedMeals.length > 0) {
          setSelectedMeal(formattedMeals[0]);
        }
      } else {
        console.warn("No recommendations returned from API");
        toast({
          title: "No Recommendations",
          description: "No meal recommendations found. Please refresh or update your preferences.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      
      // Handle timeout errors with a more helpful message
      if (error.code === 'ECONNABORTED') {
        toast({
          title: "First-time Recommendations Take Longer",
          description: "The first time you request diet recommendations may take up to 3 minutes. Please use the 'Generate New Recommendations' button to start the process.",
          variant: "warning",
          duration: 10000
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch recommendations. Please try again later.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
      requestInProgress.current = false;
    }
  }, [toast]);
  
  // Update loadUserData to use useCallback
  const loadUserData = useCallback(async () => {
    try {
      console.log("Loading user profile data...");
      const userResponse = await userApi.getProfile();
      if (userResponse.data) {
        const userData = userResponse.data;
        console.log("Loaded user profile data:", userData);
        
        // Set the userData state variable
        setUserData(userData);
        
        // Try to fetch the user's nutrition targets from health API first
        let calorieTarget = 0;
        let proteinTarget = 0;
        let carbsTarget = 0;
        let fatsTarget = 0;
        
        try {
          // First try to get values from health API
          const nutrientResponse = await healthApi.getDailyNutrients();
          if (nutrientResponse.data) {
            console.log("Loaded nutrient targets from API:", nutrientResponse.data);
            
            calorieTarget = nutrientResponse.data.calorie_target || 0;
            proteinTarget = nutrientResponse.data.protein_target || 0;
            carbsTarget = nutrientResponse.data.carb_target || 0;
            fatsTarget = nutrientResponse.data.fat_target || 0;
          }
        } catch (nutrientError) {
          console.warn("Could not load nutrient targets from API", nutrientError);
        }
        
        if (!calorieTarget || !proteinTarget || !carbsTarget || !fatsTarget) {
          calorieTarget = userData.calorie_goal || 0;
          proteinTarget = userData.protein_goal || 0;
          carbsTarget = userData.carbs_goal || 0; 
          fatsTarget = userData.fat_goal || 0;
          console.log("Using nutrient targets from user profile:", { calorieTarget, proteinTarget, carbsTarget, fatsTarget });
        }
        
        // Only calculate if we still don't have values
        if (!calorieTarget || !proteinTarget || !carbsTarget || !fatsTarget) {
          console.log("No targets found in API or profile, calculating from scratch");
          const calculatedTargets = calculateNutritionalTargets(userData);
          calorieTarget = calculatedTargets.calorieTarget;
          proteinTarget = calculatedTargets.protein;
          carbsTarget = calculatedTargets.carbs;
          fatsTarget = calculatedTargets.fats;
        }
        
        // Transform user data to dietary preferences format
        const preferences = {
          restrictions: [],
          allergies: [],
          calorieTarget,
          macroTargets: {
            protein: proteinTarget,
            carbs: carbsTarget,
            fats: fatsTarget
          }
        };
        
        // Process dietary restrictions
        if (userData.dietary_restriction) {
          // Handle as a single value or as a comma-separated list
          if (userData.dietary_restriction.includes(',')) {
            preferences.restrictions = userData.dietary_restriction
              .split(',')
              .map(item => item.trim())
              .filter(item => item && item.toLowerCase() !== 'none' && item.toLowerCase() !== 'string');
          } else if (userData.dietary_restriction.toLowerCase() !== 'none' && userData.dietary_restriction.toLowerCase() !== 'string') {
            preferences.restrictions = [userData.dietary_restriction.trim()];
          }
        }
        
        // Process food allergies
        if (userData.food_allergies) {
          // Handle as a single value or as a comma-separated list
          if (userData.food_allergies.includes(',')) {
            preferences.allergies = userData.food_allergies
              .split(',')
              .map(item => item.trim())
              .filter(item => item && item.toLowerCase() !== 'string');
          } else if (userData.food_allergies.toLowerCase() !== 'string') {
            preferences.allergies = [userData.food_allergies.trim()];
          }
        }
        
        setDietaryPreferences(preferences);
        console.log("Final dietary preferences with targets:", preferences);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your dietary preferences",
        variant: "destructive"
      });
    }
    
    // Fetch recommendations after getting user data
    await fetchRecommendations();
  }, [fetchRecommendations, toast]);
  
  // Update the useEffect dependency
  useEffect(() => {
    // Only run on first mount
    if (isInitialMount.current) {
      console.log("Initial mount - loading user data");
      isInitialMount.current = false;
      
      // Call the loadUserData function
      loadUserData();
    }
    
    // Add this cleanup function to reset state when component unmounts
    return () => {
      console.log("Unmounting DietRecommendation component");
      // Reset any state if needed when component unmounts
    };
  }, [loadUserData]);
  
  // Handle dislike
  const handleDislike = async (mealId) => {
    try {
      // Remove the meal from suggestions
      const updatedSuggestions = mealSuggestions.filter(meal => meal.id !== mealId);
      setMealSuggestions(updatedSuggestions);
      
      if (selectedMeal.id === mealId) {
        setSelectedMeal(updatedSuggestions.length > 0 ? updatedSuggestions[0] : null);
      }
      
      // Call API to record the dislike
      await recommendationApi.dislikeRecommendation(mealId);
      
      toast({
        title: "Preference Saved",
        description: "This meal won't be recommended again",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error registering dislike:', error);
      toast({
        title: "Error",
        description: "Failed to save your preference",
        variant: "destructive"
      });
    }
  };
  
  // Handle log meal
  const handleLogMeal = async (meal) => {
    try {
      // Prepare meal data for logging
      const mealData = {
        meal_name: meal.name,
        calories: meal.calories,
        protein: meal.macros.protein,
        carbohydrates: meal.macros.carbs,
        fats: meal.macros.fats,
        fiber: meal.macros.fiber
      };
      
      // Call API to log the meal
      await mealApi.logMeal(mealData);
      
      // Show toast notification
      toast({
        title: "Meal Logged",
        description: "This meal has been added to your food diary",
        variant: "success"
      });
      
      // Show popup
      setLogMealPopup({
        isOpen: true,
        success: true,
        mealName: meal.name
      });
      
      // Dispatch a custom event to notify Dashboard component
      window.dispatchEvent(new CustomEvent('meal-logged', { detail: mealData }));
      
    } catch (error) {
      console.error('Error logging meal:', error);
      
      // Show toast notification for error
      toast({
        title: "Error",
        description: "Failed to log this meal",
        variant: "destructive"
      });
      
      // Show error popup
      setLogMealPopup({
        isOpen: true,
        success: false,
        mealName: meal.name
      });
    }
  };
  
  // Handle refresh recommendations
  const handleRefreshRecommendations = async () => {
    // Prevent duplicate requests
    if (requestInProgress.current || isGenerating) {
      console.log("Request already in progress, skipping");
      return;
    }
    
    setIsGenerating(true);
    requestInProgress.current = true;
     
    try {
      // Show toast notification that recommendations are being generated
      toast({
        title: "Generating Recommendations",
        description: "Creating new personalized meal suggestions - this may take up to 3 minutes for first-time recommendations...",
        variant: "default",
        duration: 10000 // longer duration since API call might take time
      });
      
      // Clear any cached recommendations
      setMealSuggestions([]);
      
      // Force regenerate to true and add a cache-busting parameter
      const timestamp = new Date().getTime();
      console.log(`Getting fresh recommendations with timestamp: ${timestamp}`);
      
      try {
        const response = await recommendationApi.getRecommendations(3, true, timestamp);
        console.log("Received new recommendations: ", response.data.map(r => r.meal_name).join(", "));
        
        if (response.data && response.data.length > 0) {
          // Transform API response
          processAndDisplayRecommendations(response.data);
        } else {
          toast({
            title: "No Recommendations",
            description: "Could not retrieve new meal recommendations. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error refreshing recommendations:', error);
        
        // Special handling for timeout errors - start a polling mechanism
        if (error.code === 'ECONNABORTED' || error.stillGenerating) {
          toast({
            title: "Still Working",
            description: "The meal recommendations are still being generated. This may take up to 3 minutes for first-time recommendations. Please wait or try refreshing the page in a moment.",
            variant: "warning",
            duration: 10000
          });
          
          // Set up a recurring check to poll for results
          const maxRetries = 5;
          let retryCount = 0;
          
          const checkForResults = () => {
            if (retryCount >= maxRetries) {
              setIsGenerating(false);
              requestInProgress.current = false;
              toast({
                title: "Generation Timeout",
                description: "We couldn't complete recommendation generation. Please try again later.",
                variant: "destructive"
              });
              return;
            }
            
            retryCount++;
            
            toast({
              title: `Checking for Results (Attempt ${retryCount}/${maxRetries})`,
              description: "Checking if your recommendations are ready...",
              variant: "default"
            });
            
            // Try to fetch existing recommendations (not regenerating)
            recommendationApi.getRecommendations(3, false)
              .then(response => {
                if (response.data && response.data.length > 0) {
                  toast({
                    title: "Success!",
                    description: "Your recommendations are now ready!",
                    variant: "success"
                  });
                  // Process the recommendations
                  processAndDisplayRecommendations(response.data);
                  // Done with polling
                  setIsGenerating(false);
                  requestInProgress.current = false;
                } else {
                  // No results yet, schedule another check
                  console.log(`No results yet on attempt ${retryCount}, checking again in 20 seconds...`);
                  setTimeout(checkForResults, 20000);
                }
              })
              .catch(fetchError => {
                console.error('Error checking for recommendations:', fetchError);
                // Still not ready, schedule another check
                console.log(`Error checking on attempt ${retryCount}, checking again in 20 seconds...`);
                setTimeout(checkForResults, 20000);
              });
          };
          
          // Start polling after 20 seconds
          setTimeout(checkForResults, 20000);
          return;
        }
        
        // Handle other errors (non-timeout)
        let errorMessage = "Failed to refresh recommendations. Please try again later.";
        let errorDetails = "";
        
        if (error.response) {
          // The server responded with an error status
          if (error.response.status === 500) {
            errorMessage = "The recommendation service encountered an internal server error.";
            
            // Try to extract more detailed error from the response
            if (error.response.data) {
              if (error.response.data.detail) {
                errorDetails = error.response.data.detail;
              } else if (typeof error.response.data === 'string') {
                errorDetails = error.response.data;
              } else {
                errorDetails = JSON.stringify(error.response.data, null, 2);
              }
            }
          } else if (error.response.status === 429) {
            errorMessage = "Too many requests. Please wait a moment before trying again.";
          } else if (error.response.status === 404) {
            errorMessage = "The recommendation service could not be found.";
          }
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = "No response from the recommendation service. Please check your connection.";
        }
        
        // Show the primary error toast
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        
        // If there is detailed error information, show it in a separate toast for debugging
        if (errorDetails) {
          setTimeout(() => {
            toast({
              title: "Detailed Error Information",
              description: (
                <div className="max-h-80 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap">{errorDetails}</pre>
                </div>
              ),
              variant: "destructive",
              duration: 10000
            });
          }, 1000);
        }
        
        // Reset state
        setIsGenerating(false);
        requestInProgress.current = false;
      }
    } catch (outerError) {
      console.error('Unexpected error in refresh process:', outerError);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive"
      });
      
      // Reset state
      setIsGenerating(false);
      requestInProgress.current = false;
    }
  };
  
  // Update the processAndDisplayRecommendations function to include detailed scoring
  const processAndDisplayRecommendations = (recommendationData) => {
    // Transform API response to the format our component expects
    const formattedMeals = recommendationData.map(recommendation => {
      // Parse ingredients and instructions from recipe
      let recipeText = recommendation.recipe || '';
      
      // Try to parse as JSON first in case it's a serialized JSON object
      try {
        const jsonRecipe = JSON.parse(recipeText);
        if (typeof jsonRecipe === 'object') {
          // Handle structured JSON format if API returns it that way
          if (jsonRecipe.ingredients && jsonRecipe.instructions) {
            const ingredients = Array.isArray(jsonRecipe.ingredients) 
              ? jsonRecipe.ingredients
              : [jsonRecipe.ingredients];
              
            const instructions = Array.isArray(jsonRecipe.instructions)
              ? jsonRecipe.instructions
              : [jsonRecipe.instructions];
              
            return {
              id: recommendation.id,
              name: recommendation.meal_name,
              calories: recommendation.calories || 0,
              prepTime: recommendation.prep_time || 15,
              cookTime: recommendation.cook_time || 20,
              healthImpactScore: recommendation.nutrient_score || 0,
              // Detailed scoring breakdown
              nutrientAdequacyScore: recommendation.nutrient_adequacy_score || 0,
              mealBalanceScore: recommendation.meal_balance_score || 0,
              healthImpactDetailScore: recommendation.health_impact_score || 0,
              personalizationScore: recommendation.personalization_score || 0,
              scoreExplanation: recommendation.score_explanation || "No detailed explanation available.",
              macros: {
                protein: recommendation.protein || 0,
                carbs: recommendation.carbs || 0,
                fats: recommendation.fats || 0,
                fiber: recommendation.fiber || 0
              },
              ingredients: ingredients.map(item => typeof item === 'string' ? item : JSON.stringify(item)),
              instructions: instructions.map(item => typeof item === 'string' ? item : JSON.stringify(item)),
              benefits: [
                `Overall nutrient score: ${recommendation.nutrient_score}/100`,
                recommendation.score_explanation || "Balanced macronutrient profile"
              ]
            };
          }
        }
      } catch (e) {
        // Not JSON, continue with text parsing
        console.log('Recipe is not in JSON format, continuing with text parsing');
      }
      
      // Standard text format parsing
      const ingredientsMatch = recipeText.match(/Ingredients:([\s\S]*?)Instructions:/);
      const instructionsMatch = recipeText.match(/Instructions:([\s\S]*)/);
      
      const ingredientsText = ingredientsMatch ? ingredientsMatch[1].trim() : '';
      const instructionsText = instructionsMatch ? instructionsMatch[1].trim() : '';
      
      // Parse ingredients into array
      const ingredients = ingredientsText
        .split('\n')
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(line => line.length > 0);
      
      // Parse instructions into array
      const instructions = instructionsText
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);
      
      // Generate health benefits based on nutrient score and explanation
      const benefits = [
        `Overall nutrient score: ${recommendation.nutrient_score}/100`,
        recommendation.score_explanation || "Balanced macronutrient profile"
      ];
      
      return {
        id: recommendation.id,
        name: recommendation.meal_name,
        calories: recommendation.calories || 0,
        prepTime: recommendation.prep_time || 15,
        cookTime: recommendation.cook_time || 20,
        healthImpactScore: recommendation.nutrient_score || 0,
        // Detailed scoring breakdown
        nutrientAdequacyScore: recommendation.nutrient_adequacy_score || 0,
        mealBalanceScore: recommendation.meal_balance_score || 0,
        healthImpactDetailScore: recommendation.health_impact_score || 0,
        personalizationScore: recommendation.personalization_score || 0,
        scoreExplanation: recommendation.score_explanation || "No detailed explanation available.",
        macros: {
          protein: recommendation.protein || 0,
          carbs: recommendation.carbs || 0,
          fats: recommendation.fats || 0,
          fiber: recommendation.fiber || 0
        },
        ingredients: ingredients,
        instructions: instructions,
        benefits: benefits
      };
    });
    
    console.log("New recommendations processed:", formattedMeals.map(m => m.name));
    setMealSuggestions(formattedMeals);
    
    if (formattedMeals.length > 0) {
      setSelectedMeal(formattedMeals[0]);
    }
    
    toast({
      title: "Recommendations Updated",
      description: "New meal suggestions have been generated",
      variant: "success"
    });
    
    // Reset states
    setIsGenerating(false);
    requestInProgress.current = false;
  };
  
  // Handle update preferences
  const handleUpdatePreferences = async () => {
    try {
      // Calculate and update nutritional targets before redirecting
      await userApi.updateNutrientTargets();
      toast({
        title: "Nutritional Targets Updated",
        description: "Your nutritional targets have been recalculated based on your profile.",
        variant: "success"
      });
    } catch (error) {
      console.error("Error updating nutritional targets:", error);
    }
    
    // Navigate to profile form
    navigate('/profile-form');
  };
  
  // Calculate macro percentages for preferences
  const calculatePreferenceMacroPercentage = (macro) => {
    const calorieTarget = dietaryPreferences.calorieTarget;
    if (!calorieTarget || calorieTarget <= 0) {
      console.log(`No valid calorie target found: ${calorieTarget}`);
      return 0;
    }
    
    let macroCalories = 0;
    
    switch (macro) {
      case 'protein':
        if (!dietaryPreferences.macroTargets.protein) {
          console.log('No protein target found');
          return 0;
        }
        macroCalories = dietaryPreferences.macroTargets.protein * 4; // 4 calories per gram of protein
        break;
      case 'carbs':
        if (!dietaryPreferences.macroTargets.carbs) {
          console.log('No carbs target found');
          return 0;
        }
        macroCalories = dietaryPreferences.macroTargets.carbs * 4; // 4 calories per gram of carbs
        break;
      case 'fats':
        if (!dietaryPreferences.macroTargets.fats) {
          console.log('No fats target found');
          return 0;
        }
        macroCalories = dietaryPreferences.macroTargets.fats * 9; // 9 calories per gram of fat
        break;
      default:
        return 0;
    }
    
    const percentage = Math.round((macroCalories / calorieTarget) * 100);
    console.log(`Calculated ${macro} percentage: ${percentage}% (${macroCalories}/${calorieTarget})`);
    return percentage;
  };
  
  // Calculate macro percentages for selected meal
  const calculateMealMacroPercentage = (macro, meal) => {
    const totalCalories = meal.calories;
    if (!totalCalories) return 0;
    
    let macroCalories = 0;
    
    switch (macro) {
      case 'protein':
        macroCalories = meal.macros.protein * 4; // 4 calories per gram of protein
        break;
      case 'carbs':
        macroCalories = meal.macros.carbs * 4; // 4 calories per gram of carbs
        break;
      case 'fats':
        macroCalories = meal.macros.fats * 9; // 9 calories per gram of fat
        break;
      default:
        return 0;
    }
    
    return Math.round((macroCalories / totalCalories) * 100);
  };
  
  const recalculateTargets = async (showToasts = true) => {
    if (showToasts) {
      toast({
        title: "Updating Targets",
        description: "Updating nutritional targets based on your profile...",
        variant: "default"
      });
    }
    
    try {
      // Use the unified nutritional targets synch
      const unifiedTargets = await syncNutritionalTargets();
      console.log("Received unified nutritional targets:", unifiedTargets);
      
      setDietaryPreferences(prev => ({
        ...prev,
        calorieTarget: unifiedTargets.calorieTarget || prev.calorieTarget,
        macroTargets: {
          protein: unifiedTargets.protein || prev.macroTargets.protein,
          carbs: unifiedTargets.carbs || prev.macroTargets.carbs,
          fats: unifiedTargets.fats || prev.macroTargets.fats
        }
      }));
      
      console.log("Updated dietary preferences with unified targets:", {
        calories: unifiedTargets.calorieTarget,
        protein: unifiedTargets.protein,
        carbs: unifiedTargets.carbs,
        fats: unifiedTargets.fats
      });
      
      if (showToasts) {
        toast({
          title: "Success",
          description: "Nutritional targets have been updated successfully!",
          variant: "success"
        });
      }
    } catch (error) {
      console.error("Error updating nutritional targets:", error);
      
      // Try getting the targets from the shared localStorage cache
      try {
        const cachedTargets = getUnifiedNutrientTargets();
        if (cachedTargets) {
          console.log("Using cached unified targets:", cachedTargets);
          
          setDietaryPreferences(prev => ({
            ...prev,
            calorieTarget: cachedTargets.calorieTarget || prev.calorieTarget,
            macroTargets: {
              protein: cachedTargets.protein || prev.macroTargets.protein,
              carbs: cachedTargets.carbs || prev.macroTargets.carbs,
              fats: cachedTargets.fats || prev.macroTargets.fats
            }
          }));
          
          if (showToasts) {
            toast({
              title: "Used Cached Targets",
              description: "Nutritional targets have been updated from local cache.",
              variant: "default"
            });
          }
          return;
        }
      } catch (cacheError) {
        console.error("Error retrieving cached targets:", cacheError);
      }
      
      // Fall back to the old method as a last resort
      if (showToasts) {
        toast({
          title: "Error",
          description: "Failed to update nutritional targets. Please try again.",
          variant: "destructive"
        });
      }
      
      await loadUserData();
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-3 text-center">
          <div className="text-lg font-medium">Preparing your personalized meal suggestions...</div>
          <Progress value={75} className="w-60 mx-auto" />
        </div>
      </div>
    );
  }
  
  // No recommendations state
  if (mealSuggestions.length === 0) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Diet Recommendations</h1>
          <p className="text-muted-foreground mt-1">Personalized meal suggestions based on your health profile</p>
        </div>
        
        <Card className="text-center p-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">No Recommendations Available</h2>
            <p className="text-muted-foreground mb-6">We couldn't find any meal recommendations that match your profile.</p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button 
                variant="outline" 
                onClick={handleUpdatePreferences}
              >
                Update Your Preferences
              </Button>
              <Button 
                variant="default" 
                onClick={handleRefreshRecommendations}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate Recommendations
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Diet Recommendations</h1>
        <p className="text-muted-foreground mt-1">Personalized meal suggestions based on your health profile</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dietary Preferences Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Current Preferences</CardTitle>
            <CardDescription>Based on your profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Dietary Restrictions</h3>
              <div className="flex flex-wrap gap-2">
                {dietaryPreferences.restrictions && 
                 dietaryPreferences.restrictions.filter(restriction => restriction.toLowerCase() !== 'string').length > 0 ? (
                  dietaryPreferences.restrictions
                    .filter(restriction => restriction.toLowerCase() !== 'string')
                    .map((restriction, index) => (
                      <Badge key={index} variant="secondary">{restriction}</Badge>
                    ))
                ) : (
                  <span className="text-sm text-muted-foreground">No restrictions specified</span>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Food Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {dietaryPreferences.allergies && 
                 dietaryPreferences.allergies.filter(allergy => allergy.toLowerCase() !== 'string').length > 0 ? (
                  dietaryPreferences.allergies
                    .filter(allergy => allergy.toLowerCase() !== 'string')
                    .map((allergy, index) => (
                      <Badge key={index} variant="destructive">{allergy}</Badge>
                    ))
                ) : (
                  <span className="text-sm text-muted-foreground">No allergies specified</span>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-medium mb-2">Your Daily Nutritional Targets</h3>
              <p className="text-xs text-muted-foreground mb-3">Recommended macronutrient goals from your health profile</p>
              {dietaryPreferences.calorieTarget > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">Calories: {roundNutrientValue(dietaryPreferences.calorieTarget)} kcal</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                      <span className="text-sm">Protein</span>
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{roundNutrientValue(dietaryPreferences.macroTargets.protein) || 0}g</span>
                        <span className="text-xs text-muted-foreground">(25% of calories)</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                      <span className="text-sm">Carbs</span>
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{roundNutrientValue(dietaryPreferences.macroTargets.carbs) || 0}g</span>
                        <span className="text-xs text-muted-foreground">(45% of calories)</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                      <span className="text-sm">Fats</span>
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{roundNutrientValue(dietaryPreferences.macroTargets.fats) || 0}g</span>
                        <span className="text-xs text-muted-foreground">(30% of calories)</span>
                      </div>
                    </div>
                    
                    <div className="relative group">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full text-xs mt-2"
                        onClick={() => recalculateTargets()}
                        disabled={!userData || !userData.height || !userData.weight || !userData.date_of_birth}
                      >
                        Recalculate Targets
                      </Button>
                      {(!userData || !userData.height || !userData.weight || !userData.date_of_birth) && (
                        <div className="absolute -top-10 left-0 right-0 mx-auto w-64 invisible group-hover:visible bg-black bg-opacity-80 text-white text-xs rounded py-1 px-2 text-center transition-opacity">
                          Complete your profile to access this feature
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground mb-2">No nutritional targets set</p>
                  <p className="text-xs text-muted-foreground mb-4">Set your daily calorie and macro targets to see recommendations tailored to your needs</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleUpdatePreferences}
              className="w-full"
              variant="outline"
            >
              Update Preferences
            </Button>
          </CardFooter>
        </Card>
        
        {/* Meal Suggestions List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personalized Meal Suggestions</CardTitle>
            <CardDescription>Based on your health goals and dietary preferences</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
              {mealSuggestions.map((meal) => (
                <Card 
                  key={meal.id}
                  className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${selectedMeal.id === meal.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedMeal(meal)}
                >
                  <div className="h-32 bg-muted flex items-center justify-center">
                    <Utensils className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium line-clamp-1">{meal.name}</h3>
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span>{roundNutrientValue(meal.calories)} kcal</span>
                      <Badge variant="outline" className={`text-xs ${meal.healthImpactScore >= 80 ? 'bg-green-100 text-green-800' : meal.healthImpactScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        Score: {meal.healthImpactScore}/100
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleRefreshRecommendations}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Suggestions
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Selected Meal Details */}
        {selectedMeal && (
          <Card className="md:col-span-3">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle>{selectedMeal.name}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedMeal.prepTime + selectedMeal.cookTime} min</span>
                      <span className="mx-1">•</span>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span>{roundNutrientValue(selectedMeal.calories)} kcal</span>
                    </div>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleDislike(selectedMeal.id)}
                    title="Dislike this meal"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="default"
                    onClick={() => handleLogMeal(selectedMeal)}
                  >
                    <Utensils className="mr-2 h-4 w-4" />
                    Log This Meal
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">Macronutrient Distribution</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Protein</span>
                      <span className="text-sm font-medium">{roundNutrientValue(selectedMeal.macros.protein)}g</span>
                    </div>
                    <Progress value={calculateMealMacroPercentage('protein', selectedMeal)} />
                    <p className="text-xs text-muted-foreground text-right">{calculateMealMacroPercentage('protein', selectedMeal)}% of calories</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Carbs</span>
                      <span className="text-sm font-medium">{roundNutrientValue(selectedMeal.macros.carbs)}g</span>
                    </div>
                    <Progress value={calculateMealMacroPercentage('carbs', selectedMeal)} />
                    <p className="text-xs text-muted-foreground text-right">{calculateMealMacroPercentage('carbs', selectedMeal)}% of calories</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Fats</span>
                      <span className="text-sm font-medium">{roundNutrientValue(selectedMeal.macros.fats)}g</span>
                    </div>
                    <Progress value={calculateMealMacroPercentage('fats', selectedMeal)} />
                    <p className="text-xs text-muted-foreground text-right">{calculateMealMacroPercentage('fats', selectedMeal)}% of calories</p>
                  </div>
                </div>
              </div>
              
              <Tabs defaultValue="ingredients" className="mt-6" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ingredients">
                    <List className="mr-2 h-4 w-4" />
                    Ingredients
                  </TabsTrigger>
                  <TabsTrigger value="instructions">
                    <Star className="mr-2 h-4 w-4" />
                    Instructions
                  </TabsTrigger>
                  <TabsTrigger value="benefits">
                    <Heart className="mr-2 h-4 w-4" />
                    Health Benefits
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="ingredients" className="mt-4">
                  <ul className="space-y-2">
                    {selectedMeal.ingredients.length > 0 ? (
                      selectedMeal.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs mr-2">•</span>
                          <span>{ingredient}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No detailed ingredients available</li>
                    )}
                  </ul>
                </TabsContent>
                
                <TabsContent value="instructions" className="mt-4">
                  <ol className="space-y-3">
                    {selectedMeal.instructions.length > 0 ? (
                      selectedMeal.instructions.map((instruction, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs mr-2">{index+1}</span>
                          <span>{instruction}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No detailed instructions available</li>
                    )}
                  </ol>
                </TabsContent>
                
                <TabsContent value="benefits" className="mt-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center mb-3">
                      <BarChart3 className="h-5 w-5 text-primary mr-2" />
                      <h3 className="font-medium">Scientific Dietary Impact Score: <span className="text-primary font-bold">{selectedMeal.healthImpactScore}/100</span></h3>
                    </div>
                    
                    <div className="mt-4 mb-4">
                      <p className="text-sm text-muted-foreground mb-3">{selectedMeal.scoreExplanation}</p>
                      
                      <div className="space-y-3 mt-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Nutrient Adequacy (40%)</span>
                            <span className="text-sm">{selectedMeal.nutrientAdequacyScore || Math.round(selectedMeal.healthImpactScore * 0.4)}/40</span>
                          </div>
                          <Progress value={((selectedMeal.nutrientAdequacyScore || Math.round(selectedMeal.healthImpactScore * 0.4)) / 40) * 100} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Meal Balance (20%)</span>
                            <span className="text-sm">{selectedMeal.mealBalanceScore || Math.round(selectedMeal.healthImpactScore * 0.2)}/20</span>
                          </div>
                          <Progress value={((selectedMeal.mealBalanceScore || Math.round(selectedMeal.healthImpactScore * 0.2)) / 20) * 100} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Health Impact (20%)</span>
                            <span className="text-sm">{selectedMeal.healthImpactDetailScore || Math.round(selectedMeal.healthImpactScore * 0.2)}/20</span>
                          </div>
                          <Progress value={((selectedMeal.healthImpactDetailScore || Math.round(selectedMeal.healthImpactScore * 0.2)) / 20) * 100} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Personalization (20%)</span>
                            <span className="text-sm">{selectedMeal.personalizationScore || Math.round(selectedMeal.healthImpactScore * 0.2)}/20</span>
                          </div>
                          <Progress value={((selectedMeal.personalizationScore || Math.round(selectedMeal.healthImpactScore * 0.2)) / 20) * 100} className="h-2" />
                        </div>
                      </div>
                    </div>
                    
                    <ul className="space-y-2 mt-6 border-t pt-4">
                      <h4 className="font-medium mb-2">Health Benefits</h4>
                      {selectedMeal.benefits && selectedMeal.benefits.length > 0 ? (
                        selectedMeal.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start">
                            <Leaf className="h-5 w-5 text-green-600 mr-2 shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-foreground">No health benefits information available</li>
                      )}
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
      
      <LogMealPopup
        isOpen={logMealPopup.isOpen}
        onClose={() => setLogMealPopup({ ...logMealPopup, isOpen: false })}
        success={logMealPopup.success}
        mealName={logMealPopup.mealName}
      />
    </div>
  );
};

export default DietRecommendation; 
 
 