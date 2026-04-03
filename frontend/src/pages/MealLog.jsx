import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { mealApi, waterApi, userApi } from '../services/api';
import { BarChart3 } from 'lucide-react';
import { Progress } from '../components/ui/progress';

// Water intake guidelines by age
const waterIntakeGuidelines = [
  { age: "Toddlers (1-3)", glasses: "4-5 glasses (~1.3 L/day)", minAge: 1, maxAge: 3 },
  { age: "Children (4-8)", glasses: "5-6 glasses (~1.6 L/day)", minAge: 4, maxAge: 8 },
  { age: "Older children (9-13)", glasses: "6-8 glasses (~1.9-2.1 L/day)", minAge: 9, maxAge: 13 },
  { age: "Teenagers (14-18)", glasses: "8-11 glasses (~2.3-3.3 L/day)", minAge: 14, maxAge: 18 },
  { age: "Adult Men (19+)", glasses: "15.5 cups (~3.7 L/day)", minAge: 19, maxAge: 150, gender: "male" },
  { age: "Adult Women (19+)", glasses: "11.5 cups (~2.7 L/day)", minAge: 19, maxAge: 150, gender: "female" },
];

// Add common foods fallbacks
const commonFoods = [
  { name: "Apple", calories: 95, protein: 0.5, carbs: 25, fats: 0.3, sugar: 19, fiber: 4 },
  { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fats: 0.4, sugar: 14, fiber: 3.1 },
  { name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6, sugar: 0, fiber: 0 },
  { name: "Salmon", calories: 206, protein: 22, carbs: 0, fats: 13, sugar: 0, fiber: 0 },
  { name: "Broccoli", calories: 55, protein: 3.7, carbs: 11.2, fats: 0.6, sugar: 2.6, fiber: 5.1 },
  { name: "Brown Rice", calories: 216, protein: 4.5, carbs: 45, fats: 1.8, sugar: 0.7, fiber: 3.5 },
  { name: "Egg", calories: 78, protein: 6.3, carbs: 0.6, fats: 5.3, sugar: 0.6, fiber: 0 },
  { name: "Whole Milk", calories: 149, protein: 7.7, carbs: 11.7, fats: 8, sugar: 12.3, fiber: 0 },
  { name: "Avocado", calories: 240, protein: 3, carbs: 12.8, fats: 22, sugar: 1, fiber: 10 },
  { name: "Oatmeal", calories: 158, protein: 5.9, carbs: 27, fats: 3.2, sugar: 0.5, fiber: 4 }
];

const MealLog = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  

  const dataFetchedRef = useRef(false);
  
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab');
  
  // State for meal logging
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [mealHistory, setMealHistory] = useState([]);
  const [manualEntry, setManualEntry] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    sugar: '',
    fiber: ''
  });
  

  const [waterGlasses, setWaterGlasses] = useState(4);
  const [waterHistory, setWaterHistory] = useState([]);

  const [selectedMeal, setSelectedMeal] = useState(null);

  const [activeTab, setActiveTab] = useState(tabFromUrl === 'water-intake' ? 'water-intake' : 'log-meal');
  

  const [searchApiDown, setSearchApiDown] = useState(false);
  
  const [userProfile, setUserProfile] = useState(null);
  const [userAge, setUserAge] = useState(null);
  const [userGender, setUserGender] = useState(null);
  const [applicableGuideline, setApplicableGuideline] = useState(null);
  
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const debouncedSearch = useCallback((query) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('Canceled previous search request');
    }
    
    abortControllerRef.current = new AbortController();
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 500); 
  }, []);
  
  const performSearch = async (query) => {
    if (!query.trim()) {
      toast({
        title: "Empty Search",
        description: "Please enter a food item to search.",
        variant: "default",
      });
      return;
    }
    
    // Show searching state and clear previous results
    setIsSearching(true);
    setSearchResults([]);
    
 
    const timeoutId = setTimeout(() => {
      console.log('Search timeout reached after 20 seconds, aborting request');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 20000);
    
    try {
      console.log(`Executing search for "${query}" at ${new Date().toISOString()}`);
      
      toast({
        title: "Searching...",
        description: `Looking for "${query}". This may take a moment.`,
        variant: "default",
      });
      

      const response = await mealApi.searchFoods(query, abortControllerRef.current.signal);
      
      clearTimeout(timeoutId);
      
      if (response) {
        console.log(`Search completed at ${new Date().toISOString()}`);
        
        let resultsArray = [];
        if (response.data && response.data.results) {
          resultsArray = response.data.results;
          console.log('Raw API response:', response.data);
          console.log('First result item:', resultsArray[0]);
        }
                           
        console.log(`Found ${resultsArray.length} results before validation`);
        

        const validResults = resultsArray.map(item => {

          const itemName = item.name || item.product_name;
          

          if (!item || typeof itemName !== 'string' || itemName.trim() === '') {
            return null;
          }
          
          if (item.energy_100g && !item.calories) {
            item.calories = item.energy_100g / 4.184; // Convert kJ to kcal
          }
          

          return {
            name: itemName,
            calories: Number(item.calories || 0).toFixed(1),
            protein: Number(item.protein || 0).toFixed(1),
            carbs: Number(item.carbs || 0).toFixed(1),
            fats: Number(item.fats || 0).toFixed(1),
            sugar: Number(item.sugar || 0).toFixed(1),
            fiber: Number(item.fiber || 0).toFixed(1),
            imageUrl: item.imageUrl || item.image_url
          };
        }).filter(Boolean); // Remove null items
        
        console.log(`Found ${validResults.length} valid food items`);
        
        setSearchResults(validResults);
        
        if (validResults.length === 0) {
          toast({
            title: "No Results Found",
            description: "No matching foods found. Try using more general terms or check your spelling.",
            variant: "default",
          });
        } else {
          toast({
            title: "Results Found",
            description: `Found ${validResults.length} results for "${query}"`,
            variant: "default",
          });
        }
      } else {
        console.warn('Search response is empty or invalid');
        toast({
          title: "No Results",
          description: "No matching foods found. Try another search term.",
          variant: "default",
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      console.error('Detailed search error:', error);
      
      if (error.code === 'ECONNABORTED') {
        toast({
          title: "Search Timed Out",
          description: "The food database is taking too long to respond. Try a more specific search term or try again later.",
          variant: "destructive",
        });
      } else if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('Search was cancelled by user or new search');
      } else {
        toast({
          title: "Search Failed",
          description: "Failed to search for food items. Please try again.",
          variant: "destructive",
        });
      }
      
      setIsSearching(false);
      return;
    }
  };
  
  const handleSearch = () => {
    debouncedSearch(searchQuery);
  };
  
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Fetch meal and water history on component mount
  useEffect(() => {
    if (dataFetchedRef.current) return;
    
    let isMounted = true;
    
    const controller = new AbortController();
    
    let waterHistoryFetchFailed = false;
    
    const fetchData = async () => {
      try {
        const cachedMealHistory = localStorage.getItem('meal_history');
        if (cachedMealHistory && isMounted) {
          try {
            const parsedMealHistory = JSON.parse(cachedMealHistory);
            setMealHistory(parsedMealHistory);
          } catch (e) {
            console.error('Error parsing cached meal history:', e);
          }
        }
        
        if (isMounted) {
          loadUserProfile();
        }
        
        try {
          const mealApiUnavailable = localStorage.getItem('meal_api_unavailable') === 'true';
          
          if (!mealApiUnavailable) {
            const mealResponse = await mealApi.getMealHistory();
            if (mealResponse.data && isMounted) {
              if (Array.isArray(mealResponse.data)) {
                setMealHistory(mealResponse.data);
                localStorage.setItem('meal_history', JSON.stringify(mealResponse.data));
              } else {
                console.warn('Meal history response is not an array:', mealResponse.data);
                if (cachedMealHistory) {
                  try {
                    const parsedMealHistory = JSON.parse(cachedMealHistory);
                    if (Array.isArray(parsedMealHistory)) {
                      setMealHistory(parsedMealHistory);
                    }
                  } catch (e) {
                    console.error('Error parsing cached meal history:', e);
                  }
                }
              }
            }
          } else {
            console.log('Using cached meal history (API unavailable)');
          }
        } catch (mealError) {
          console.error('Error fetching meal data:', mealError);
          if (cachedMealHistory && isMounted) {
            try {
              const parsedMealHistory = JSON.parse(cachedMealHistory);
              setMealHistory(parsedMealHistory);
            } catch (e) {
              console.error('Error parsing cached meal history fallback:', e);
            }
          }
          
          if (isMounted && !cachedMealHistory) {
            toast({
              title: "Data Fetch Failed",
              description: "Failed to load your meal history.",
              variant: "destructive",
            });
          }
        }
        
        if (localStorage.getItem('water_api_unavailable') === 'true') {
          waterHistoryFetchFailed = true;
          
          const cachedWaterHistory = localStorage.getItem('water_history');
          if (cachedWaterHistory && isMounted) {
            try {
              const parsedHistory = JSON.parse(cachedWaterHistory);
              setWaterHistory(parsedHistory);
              
              const today = waterApi._getTodayDate();
              const todayEntry = parsedHistory.find(entry => entry.date === today);
              if (todayEntry) {
                setWaterGlasses(todayEntry.glasses);
              }
            } catch (e) {
              console.error('Error parsing cached water history:', e);
              setWaterHistory([]);
            }
          } else {
            setWaterHistory([]);
          }
        }
        
        else if (!waterHistoryFetchFailed && isMounted) {
          try {
            let waterResponse;
            try {
              console.log('Fetching water history data...');
              waterResponse = await waterApi.getWaterHistory(30);
              console.log('Water history response received:', waterResponse.source || 'api');
            } catch (apiError) {
              if (apiError.code === 'ERR_DUPLICATE' && apiError.isBenign) {
                console.log('Duplicate water history request detected, using cached data');
                
                const cachedData = localStorage.getItem('water_history');
                if (cachedData && isMounted) {
                  try {
                    const parsedData = JSON.parse(cachedData);
                    setWaterHistory(parsedData);
                    
                    const today = waterApi._getTodayDate();
                    const todayEntry = parsedData.find(entry => entry.date === today);
                    if (todayEntry) {
                      setWaterGlasses(todayEntry.glasses);
                    }
                    return; 
                  } catch (parseError) {
                    console.error('Error parsing cached water history:', parseError);
                  }
                }
              } else {
                console.error('Water API call error:', apiError);
                waterHistoryFetchFailed = true;
                localStorage.setItem('water_api_unavailable', 'true');
                
                if (isMounted) {
                  setWaterHistory([]);
                }
                
                throw apiError; 
              }
            }
            
            if (waterResponse && waterResponse.data && isMounted) {
              setWaterHistory(waterResponse.data);
              
              const today = waterApi._getTodayDate();
              const todayEntry = waterResponse.data.find(entry => entry.date === today);
              if (todayEntry) {
                setWaterGlasses(todayEntry.glasses);
              }
              
              // Cache the water history
              localStorage.setItem('water_history', JSON.stringify(waterResponse.data));
            }
          } catch (error) {
            console.error('Error fetching water history:', error);
            
            waterHistoryFetchFailed = true;
            
            if (error.response && error.response.status === 404) {
              if (isMounted) {
                setWaterHistory([]);
                
                localStorage.setItem('water_api_unavailable', 'true');
                
                toast({
                  title: "Water History Unavailable",
                  description: "The water tracking feature is not available yet.",
                  variant: "default",
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in main fetch operation:', error);
      }
      
      if (isMounted) {
        dataFetchedRef.current = true;
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []); 

  useEffect(() => {
    if (activeTab === 'water-intake') {
      const today = waterApi._getTodayDate();
      console.log(`Water intake tab activated, checking data for: ${today}`);
      
      const loadLatestWaterData = async () => {
        try {
          const todayWater = await waterApi.getTodayWater();
          if (todayWater) {
            setWaterGlasses(todayWater.glasses);
          }
        } catch (error) {
          console.error('Error loading today\'s water data:', error);
        }
      };
      
      loadLatestWaterData();
      
      const removeListener = waterApi.addWaterChangeListener((data) => {
        if (data.date === today) {
          console.log(`Water data changed externally: ${data.glasses} glasses`);
          setWaterGlasses(data.glasses);
        }
      });
      
      return () => {
        removeListener();
      };
    }
  }, [activeTab]);
  
  useEffect(() => {
    if (activeTab === 'water-intake') {
      const checkTodayWaterIntake = () => {
        try {
          const today = waterApi._getTodayDate();
          const cachedWaterHistory = localStorage.getItem('water_history');
          
          if (cachedWaterHistory) {
            const parsedHistory = JSON.parse(cachedWaterHistory);
            
            let mostRecentEntry = null;
            if (parsedHistory.length > 0) {
              mostRecentEntry = parsedHistory.sort((a, b) => 
                new Date(b.date) - new Date(a.date)
              )[0];
            }
            
            const todayEntry = parsedHistory.find(entry => entry.date === today);
            
            if (todayEntry) {
              setWaterGlasses(todayEntry.glasses);
            } else {
              setWaterGlasses(0);
              
              const updatedHistory = [...parsedHistory, { date: today, glasses: 0 }];
              setWaterHistory(updatedHistory);
              localStorage.setItem('water_history', JSON.stringify(updatedHistory));
              
              if (mostRecentEntry && mostRecentEntry.date !== today) {
                console.log(`New day detected. Created new water intake entry for ${today}`);
                toast({
                  title: "New Day Started",
                  description: "Your water intake has been reset for today.",
                  variant: "default",
                });
              }
            }
            
            setWaterHistory(parsedHistory);
          }
        } catch (error) {
          console.error('Error checking today\'s water intake:', error);
        }
      };
      
      checkTodayWaterIntake();
    }
  }, [activeTab]); 
  
  const localFoodSearch = (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    
    return commonFoods.filter(food => 
      food.name.toLowerCase().includes(normalizedQuery)
    );
  };
  
  useEffect(() => {
    if (tabFromUrl === 'water-intake') {
      setActiveTab('water-intake');
    }
  }, [tabFromUrl]);
  
  useEffect(() => {
    if (activeTab === 'meal-history') {
      console.log('Meal history tab activated, refreshing data');
      const fetchMealHistory = async () => {
        try {
          setIsSearching(true); // Show loading state
          const mealResponse = await mealApi.getMealHistory();
          if (mealResponse.data) {
            setMealHistory(mealResponse.data);
            console.log(`Loaded ${mealResponse.data.length} meal history items`);
          }
        } catch (error) {
          console.error('Error refreshing meal history:', error);
          toast({
            title: "Data Refresh Failed",
            description: "Failed to refresh your meal history.",
            variant: "destructive",
          });
        } finally {
          setIsSearching(false);
        }
      };
      
      fetchMealHistory();
    }
  }, [activeTab]);
  
  const handleSelectFood = (food) => {
    setSelectedFood(food);
  };
  
  const handleManualEntryChange = (e) => {
    const { name, value } = e.target;
    setManualEntry(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleLogMeal = async () => {
    const mealData = selectedFood ? {
      name: selectedFood.name,
      meal_name: selectedFood.name,
      calories: selectedFood.calories,
      protein: selectedFood.protein,
      carbohydrates: selectedFood.carbs,
      fats: selectedFood.fats,
      sugar: selectedFood.sugar || 0,
      fiber: selectedFood.fiber || 0,
      timestamp: new Date().toISOString()
    } : {
      name: manualEntry.name,
      meal_name: manualEntry.name,
      calories: parseFloat(manualEntry.calories) || 0,
      protein: parseFloat(manualEntry.protein) || 0,
      carbohydrates: parseFloat(manualEntry.carbs) || 0,
      fats: parseFloat(manualEntry.fats) || 0,
      sugar: parseFloat(manualEntry.sugar) || 0,
      fiber: parseFloat(manualEntry.fiber) || 0,
      timestamp: new Date().toISOString()
    };
    
    if (!mealData.name) {
      toast({
        title: "Missing Information",
        description: "Please enter a name for your meal.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Attempting to log meal with data:', mealData);
    
    const mealApiUnavailable = localStorage.getItem('meal_api_unavailable') === 'true';
    
    setIsSearching(true); 
    
    try {
      const response = await mealApi.logMeal(mealData);
      console.log('Meal log response:', response);
      
      setMealHistory(prev => [mealData, ...prev]);
      
      setSelectedFood(null);
      setSearchQuery('');
      setSearchResults([]);
      setManualEntry({
        name: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
        sugar: '',
        fiber: ''
      });
      
      if (response.data && response.data.source === 'local') {
        toast({
          title: "Meal Logged Locally",
          description: `${mealData.name} was saved to your device. It will sync when the server is available.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Meal Logged Successfully!",
          description: `${mealData.name} (${mealData.calories} calories) has been added to your meal history. Your daily nutrition targets have been updated.`,
          variant: "success",
        });
      }
      
      window.dispatchEvent(new CustomEvent('meal-logged', { detail: mealData }));
    } catch (error) {
      console.error('Error logging meal:', error);
      
      try {
        const cachedHistory = localStorage.getItem('meal_history');
        let history = cachedHistory ? JSON.parse(cachedHistory) : [];
        history = [mealData, ...history];
        localStorage.setItem('meal_history', JSON.stringify(history));
        
        setMealHistory(prev => [mealData, ...prev]);
        
        setSelectedFood(null);
        setSearchQuery('');
        setSearchResults([]);
        setManualEntry({
          name: '',
          calories: '',
          protein: '',
          carbs: '',
          fats: '',
          sugar: '',
          fiber: ''
        });
        
        toast({
          title: "Meal Saved Locally",
          description: `${mealData.name} was saved to your device after an API error.`,
          variant: "default",
        });
        
        localStorage.setItem('meal_api_unavailable', 'true');
        
        window.dispatchEvent(new CustomEvent('meal-logged', { detail: mealData }));
        
        return; 
      } catch (localError) {
        console.error('Failed to save meal locally:', localError);
      }
      
      toast({
        title: "Log Failed",
        description: "Failed to log meal. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false); 
    }
  };
  
  const saveWaterIntake = async () => {
    try {
      const today = waterApi._getTodayDate();
      
      toast({
        title: "Saving...",
        description: "Saving your water intake data",
        variant: "default",
      });
      
      const response = await waterApi.logWater({
        date: today,
        glasses: waterGlasses
      });
      
      toast({
        title: "Water Intake Saved",
        description: `You've logged ${waterGlasses} glasses of water for today.`
      });
      
      try {
        console.log('Refreshing water history after save');
        const refreshedWaterResponse = await waterApi.getWaterHistory(30, {
          allowDuplicate: true 
        });
        
        if (refreshedWaterResponse && refreshedWaterResponse.data) {
          setWaterHistory(refreshedWaterResponse.data);
          console.log(`Water history refreshed with ${refreshedWaterResponse.data.length} entries`);
        }
      } catch (refreshError) {
        console.error("Error refreshing water history:", refreshError);
        
        const cachedHistory = localStorage.getItem('water_history');
        if (cachedHistory) {
          try {
            const parsedHistory = JSON.parse(cachedHistory);
            const updatedHistory = parsedHistory.map(entry => 
              entry.date === today ? { ...entry, glasses: waterGlasses } : entry
            );
            setWaterHistory(updatedHistory);
          } catch (e) {
            console.error("Error parsing cached water history:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error saving water intake:", error);
      toast({
        title: "Error",
        description: "Failed to save your water intake. Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await userApi.getProfile();
      if (response && response.data) {
        setUserProfile(response.data);
        
        if (response.data.date_of_birth) {
          const birthDate = new Date(response.data.date_of_birth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          
          if (today.getMonth() < birthDate.getMonth() || 
              (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          setUserAge(age);
          
          const gender = response.data.gender === 1 ? "male" : 
                        response.data.gender === 2 ? "female" : null;
          setUserGender(gender);
          
          let guideline = null;
          
          // For adults, consider gender
          if (age >= 19) {
            guideline = waterIntakeGuidelines.find(g => 
              g.minAge <= age && g.maxAge >= age && 
              (g.gender === gender || !g.gender)
            );
          } else {
            // For children and teenagers, just consider age
            guideline = waterIntakeGuidelines.find(g => 
              g.minAge <= age && g.maxAge >= age
            );
          }
          
          setApplicableGuideline(guideline);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Meal Log</h1>
        <p className="text-muted-foreground mt-1">Track your food and water intake</p>
      </div>
      
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="log-meal">Log a Meal</TabsTrigger>
          <TabsTrigger value="meal-history">Meal History</TabsTrigger>
          <TabsTrigger value="water-intake">Water Intake</TabsTrigger>
        </TabsList>
        
        {/* Log Meal Tab Content */}
        <TabsContent value="log-meal">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Search Foods</CardTitle>
                <CardDescription>
                  Find foods from our database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid w-full items-center gap-4">
                  <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input 
                      type="text" 
                      placeholder="Search for a food..." 
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button type="submit" onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="border rounded-md overflow-hidden mt-4">
                      <div className="bg-muted px-4 py-2 text-sm font-medium">
                        Search Results
                      </div>
                      <div className="divide-y">
                        {searchResults.map((food, index) => (
                          <div 
                            key={index}
                            className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted ${selectedFood === food ? 'bg-muted' : ''}`}
                            onClick={() => handleSelectFood(food)}
                          >
                            <div className="flex items-center gap-2">
                              {food.imageUrl && (
                                <img 
                                  src={food.imageUrl} 
                                  alt={food.name} 
                                  className="w-12 h-12 object-cover rounded" 
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-base">{food.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {food.calories} kcal | {food.protein}g protein | {food.carbs}g carbs | {food.fats}g fat
                                </div>
                                {(food.sugar > 0 || food.fiber > 0) && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {food.sugar > 0 && `${food.sugar}g sugar`}
                                    {food.sugar > 0 && food.fiber > 0 && ' | '}
                                    {food.fiber > 0 && `${food.fiber}g fiber`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>
                  Enter food details manually
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid w-full items-center gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="food-name">Food Name</Label>
                    <Input 
                      id="food-name" 
                      name="name"
                      placeholder="e.g., Chicken Salad" 
                      value={selectedFood ? selectedFood.name : manualEntry.name}
                      onChange={handleManualEntryChange}
                      disabled={!!selectedFood}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="calories">Calories (kcal)</Label>
                      <Input 
                        id="calories" 
                        name="calories"
                        type="number" 
                        placeholder="e.g., 250" 
                        value={selectedFood ? selectedFood.calories : manualEntry.calories}
                        onChange={handleManualEntryChange}
                        disabled={!!selectedFood}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="protein">Protein (g)</Label>
                      <Input 
                        id="protein" 
                        name="protein"
                        type="number" 
                        placeholder="e.g., 20" 
                        value={selectedFood ? selectedFood.protein : manualEntry.protein}
                        onChange={handleManualEntryChange}
                        disabled={!!selectedFood}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carbs">Carbohydrates (g)</Label>
                      <Input 
                        id="carbs" 
                        name="carbs"
                        type="number" 
                        placeholder="e.g., 30" 
                        value={selectedFood ? selectedFood.carbs : manualEntry.carbs}
                        onChange={handleManualEntryChange}
                        disabled={!!selectedFood}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fats">Fats (g)</Label>
                      <Input 
                        id="fats" 
                        name="fats"
                        type="number" 
                        placeholder="e.g., 10" 
                        value={selectedFood ? selectedFood.fats : manualEntry.fats}
                        onChange={handleManualEntryChange}
                        disabled={!!selectedFood}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sugar">Sugar (g)</Label>
                      <Input 
                        id="sugar" 
                        name="sugar"
                        type="number" 
                        placeholder="e.g., 5" 
                        value={selectedFood ? (selectedFood.sugar || '') : manualEntry.sugar}
                        onChange={handleManualEntryChange}
                        disabled={!!selectedFood}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fiber">Fiber (g)</Label>
                      <Input 
                        id="fiber" 
                        name="fiber"
                        type="number" 
                        placeholder="e.g., 3" 
                        value={selectedFood ? (selectedFood.fiber || '') : manualEntry.fiber}
                        onChange={handleManualEntryChange}
                        disabled={!!selectedFood}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                {selectedFood && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedFood(null)} 
                    className="w-full mb-2"
                  >
                    Clear Selected Food
                  </Button>
                )}
                <Button 
                  onClick={handleLogMeal} 
                  className="w-full"
                >
                  Log Meal
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Meal History Tab Content */}
        <TabsContent value="meal-history">
          <Card>
            <CardHeader>
              <CardTitle>Meal History</CardTitle>
              <CardDescription>
                Your recently logged meals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="mb-3">Loading meal history...</div>
                  <div className="animate-pulse flex space-x-4 justify-center">
                    <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                    <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                    <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                  </div>
                </div>
              ) : mealHistory.length > 0 ? (
                <div>
                  <div className="flex justify-end mb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const fetchMealHistory = async () => {
                          try {
                            setIsSearching(true);
                            const mealResponse = await mealApi.getMealHistory();
                            if (mealResponse.data) {
                              setMealHistory(mealResponse.data);
                              toast({
                                title: "Refreshed",
                                description: `Updated meal history with ${mealResponse.data.length} items`,
                                variant: "default",
                              });
                            }
                          } catch (error) {
                            console.error('Error refreshing meal history:', error);
                            toast({
                              title: "Refresh Failed",
                              description: "Failed to refresh your meal history.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsSearching(false);
                          }
                        };
                        
                        fetchMealHistory();
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Food</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Calories</TableHead>
                        <TableHead>Protein</TableHead>
                        <TableHead>Carbs</TableHead>
                        <TableHead>Fats</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mealHistory.map((meal, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{meal.name || meal.meal_name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="meal-date">
                              {new Date(meal.timestamp).toLocaleDateString()}
                            </div>
                            <div className="meal-time">
                              {new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </TableCell>
                          <TableCell>{meal.calories} kcal</TableCell>
                          <TableCell>{meal.protein || meal.proteins || 0}g</TableCell>
                          <TableCell>{meal.carbohydrates || meal.carbs || 0}g</TableCell>
                          <TableCell>{meal.fats || meal.fat || 0}g</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No meals logged yet</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('log-meal')}
                  >
                    Log Your First Meal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Water Intake Tab Content */}
        <TabsContent value="water-intake">
          <Card>
            <CardHeader>
              <CardTitle>Water Intake Tracking</CardTitle>
              <CardDescription>
                Monitor your daily hydration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 text-center">
                <h3 className="text-xl font-semibold mb-2">Today's Intake</h3>
                <div className="text-5xl font-bold mb-4">{waterGlasses}</div>
                <div className="text-sm text-muted-foreground mb-4">glasses of water</div>
                
                <div className="flex justify-center space-x-4 mb-6">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => {
                      const newValue = Math.max(0, waterGlasses - 1);
                      setWaterGlasses(newValue);
                    }}
                    disabled={waterGlasses <= 0}
                  >
                    -
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      const newValue = waterGlasses + 1;
                      setWaterGlasses(newValue);
                    }}
                  >
                    +
                  </Button>
                </div>
                
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={saveWaterIntake}
                >
                  Save Today's Intake
                </Button>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Water Intake History</h3>
                {waterHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Glasses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waterHistory.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge>{entry.glasses}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No water intake history available
                  </div>
                )}
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Recommended Daily Intake</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Age Group</TableHead>
                      <TableHead>Recommended Intake</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicableGuideline ? (
                      <TableRow>
                        <TableCell>{applicableGuideline.age}</TableCell>
                        <TableCell>{applicableGuideline.glasses}</TableCell>
                      </TableRow>
                    ) : (
                      waterIntakeGuidelines.map((guideline, index) => (
                        <TableRow key={index}>
                          <TableCell>{guideline.age}</TableCell>
                          <TableCell>{guideline.glasses}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="text-xs text-muted-foreground mt-2 text-right">Source: Mayo Clinic</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MealLog; 