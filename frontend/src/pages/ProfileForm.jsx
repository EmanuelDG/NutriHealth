import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import * as z from 'zod';

import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Checkbox } from '../components/ui/checkbox';
import { DatePicker } from '../components/ui/date-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';
import { userApi } from '../services/api';


const profileFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  
  dateOfBirth: z.date({
    required_error: "Please select your date of birth if you want to save it.",
  }).optional(),
  
  gender: z.string({
    required_error: "Please select your gender if you want to save it.",
  }).optional(),
  
  height: z.coerce.number().positive("Height must be positive").min(50, "Height seems too small").max(250, "Height seems too large").optional(),
  
  weight: z.coerce.number().positive("Weight must be positive").min(30, "Weight seems too small").max(300, "Weight seems too large").optional(),
  
  dailyPhysicalActivityGoal: z.coerce.number().positive("Daily exercise goal must be positive").optional(),
  
  heartDisease: z.boolean().default(false).optional(),
  diabetes: z.boolean().default(false).optional(),
  familyHeartDisease: z.boolean().default(false).optional(),
  familyDiabetes: z.boolean().default(false).optional(),
  smokingStatus: z.boolean().default(false).optional(),
  alcoholConsumption: z.boolean().default(false).optional(),
  
  dietaryRestriction: z.string().optional(),
  
  foodAllergies: z.array(z.string()).default([]).optional(),
});

const dietaryRestrictions = [
  { label: "None", value: "none" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Gluten-Free", value: "gluten-free" },
  { label: "Lactose-Free", value: "lactose-free" },
  { label: "Keto", value: "keto" },
  { label: "Paleo", value: "paleo" },
];

const allergies = [
  { id: "peanuts", label: "Peanuts" },
  { id: "tree-nuts", label: "Tree Nuts" },
  { id: "dairy", label: "Dairy" },
  { id: "eggs", label: "Eggs" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "wheat", label: "Wheat/Gluten" },
  { id: "soy", label: "Soy" },
  { id: "sesame", label: "Sesame" },
  { id: "corn", label: "Corn" },
];

const ProfileForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsEditMode(params.get('mode') === 'edit');
  }, [location]);

  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      dateOfBirth: undefined,
      gender: "",
      height: undefined,
      weight: undefined,
      dailyPhysicalActivityGoal: undefined,
      heartDisease: false,
      diabetes: false,
      familyHeartDisease: false,
      familyDiabetes: false,
      smokingStatus: false,
      alcoholConsumption: false,
      dietaryRestriction: "",
      foodAllergies: [],
    },
  });

  useEffect(() => {
    if (!dataLoaded) {
      setIsLoading(true);
      
      userApi.getProfile({ forceRefresh: true })
        .then(response => {
          const profileData = response.data;
          console.log("Loaded profile data from database:", profileData);
          
          const hasProfileData = profileData && (
            profileData.username || 
            profileData.date_of_birth || 
            profileData.height || 
            profileData.weight
          );
          
          if (!hasProfileData) {
            console.log("Minimal or no profile data found - likely a new user");
            setDataLoaded(true);
            setIsLoading(false);
            return;
          }
          
          const formData = {};
          
          if (profileData.username) {
            formData.username = profileData.username;
          }
          
          if (profileData.date_of_birth) {
            try {
              const birthDate = new Date(profileData.date_of_birth);
              if (!isNaN(birthDate.getTime())) {
                formData.dateOfBirth = birthDate;
              } else {
                console.warn("Invalid date_of_birth received from API:", profileData.date_of_birth);
              }
            } catch (error) {
              console.error("Error parsing date_of_birth:", error);
            }
          }
          
          if (profileData.gender !== undefined && profileData.gender !== null) {
            formData.gender = profileData.gender === 1 ? "male" : profileData.gender === 2 ? "female" : "";
          }
          
          if (profileData.height !== undefined && profileData.height !== null) {
            formData.height = profileData.height;
          }
          
          if (profileData.weight !== undefined && profileData.weight !== null) {
            formData.weight = profileData.weight;
          }
          
          if (profileData.daily_physical_activity_goal !== undefined && profileData.daily_physical_activity_goal !== null) {
            formData.dailyPhysicalActivityGoal = profileData.daily_physical_activity_goal;
          }
          
          if (profileData.heart_disease !== undefined) {
            formData.heartDisease = Boolean(profileData.heart_disease);
          }
          
          if (profileData.diabetes !== undefined) {
            formData.diabetes = Boolean(profileData.diabetes);
          }
          
          if (profileData.family_heart_disease !== undefined) {
            formData.familyHeartDisease = Boolean(profileData.family_heart_disease);
          }
          
          if (profileData.family_diabetes !== undefined) {
            formData.familyDiabetes = Boolean(profileData.family_diabetes);
          }
          
          if (profileData.smoking_status !== undefined) {
            formData.smokingStatus = Boolean(profileData.smoking_status);
          }
          
          if (profileData.alcohol_consumption !== undefined) {
            formData.alcoholConsumption = Boolean(profileData.alcohol_consumption);
          }
          
          if (profileData.dietary_restriction) {
            formData.dietaryRestriction = profileData.dietary_restriction;
          }
          
          if (profileData.food_allergies) {
            if (typeof profileData.food_allergies === 'string' && profileData.food_allergies.trim()) {
              formData.foodAllergies = profileData.food_allergies.split(',');
            } else if (Array.isArray(profileData.food_allergies)) {
              formData.foodAllergies = profileData.food_allergies;
            }
          }
          
          console.log("Setting form data from database only:", formData);
          form.reset(formData);
          
          setDataLoaded(true);
        })
        .catch(error => {
          console.error('Error fetching profile data:', error);
          if (error.response && error.response.status !== 404) {
            toast({
              title: "Error",
              description: "Failed to load your profile data. Please try again later.",
              variant: "destructive",
            });
          }
          setDataLoaded(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [form, toast, dataLoaded]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    console.log("Starting form submission with data:", data);

    try {
      const profileData = {};
      
      if (data.username && !isEditMode) {
        profileData.username = data.username;
      }
      
      if (data.dateOfBirth && !isNaN(data.dateOfBirth.getTime())) {
        profileData.date_of_birth = data.dateOfBirth.toISOString().split('T')[0];
      }
      
      if (data.gender) {
        profileData.gender = data.gender === "male" ? 1 : data.gender === "female" ? 2 : undefined;
      }
      
      if (data.height) {
        profileData.height = Number(data.height);
      }
      
      if (data.weight) {
        profileData.weight = Number(data.weight);
      }
      
      if (data.dailyPhysicalActivityGoal) {
        profileData.daily_physical_activity_goal = Number(data.dailyPhysicalActivityGoal);
      }
      
      profileData.heart_disease = data.heartDisease ? 1 : 0;
      profileData.diabetes = data.diabetes ? 1 : 0;
      profileData.family_heart_disease = data.familyHeartDisease ? 1 : 0;
      profileData.family_diabetes = data.familyDiabetes ? 1 : 0;
      profileData.smoking_status = data.smokingStatus ? 1 : 0;
      profileData.alcohol_consumption = data.alcoholConsumption ? 1 : 0;
      
      if (data.dietaryRestriction) {
        profileData.dietary_restriction = data.dietaryRestriction;
      }
      
      if (Array.isArray(data.foodAllergies) && data.foodAllergies.length > 0) {
        profileData.food_allergies = data.foodAllergies.join(',');
      }
      
      console.log("Form data:", data);
      console.log("Prepared profile data for API:", profileData);

      const response = await userApi.updateProfile(profileData);
      console.log("Profile update successful:", response);
      
      try {
        console.log("Calculating and updating nutritional targets...");
        await userApi.updateNutrientTargets();
        console.log("Nutritional targets updated successfully");
      } catch (targetError) {
        console.error("Error updating nutritional targets:", targetError);
      }
      
      if (data.username) {
        const userKey = `user_${data.username}_profile_completed`;
        localStorage.setItem(userKey, 'true');
        console.log(`Marked user ${data.username} as having completed their profile`);
      } else {
        // If no username in form data, try to get it from the API response
        const username = response?.data?.username || profileData.username;
        if (username) {
          const userKey = `user_${username}_profile_completed`;
          localStorage.setItem(userKey, 'true');
          console.log(`Marked user ${username} as having completed their profile`);
        } else {
          console.warn('Could not determine username to mark profile as completed');
        }
      }
      
      toast({
        title: isEditMode ? "Profile updated!" : "Profile created!",
        description: "Your profile information has been saved successfully.",
        variant: "success",
      });
      
      setTimeout(() => {
        if (isEditMode) {
          if (location.state?.returnTo) {
            navigate(location.state.returnTo);
          } else {
            navigate('/dashboard');
          }
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (error) {
      console.error('Form submission error:', error);
      
      let errorMessage = "There was a problem saving your profile.";
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/40 py-10">
      <div className="w-full max-w-3xl px-4">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isEditMode ? "Edit Your Profile" : "Complete Your Profile"}
            </CardTitle>
            <CardDescription className="text-center">
              Please provide your health information for personalized recommendations
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          {isEditMode ? (
                            <div className="p-2 border rounded-md bg-muted/50">
                              {field.value}
                            </div>
                          ) : (
                            <Input
                              placeholder="Enter your username"
                              {...field}
                            />
                          )}
                        </FormControl>
                        <FormDescription>
                          {isEditMode ? 
                            "Usernames cannot be changed once set." : 
                            "Choose a unique username for your profile."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date of Birth */}
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            setDate={field.onChange}
                            disabled={isLoading}
                            placeholder="Select your date of birth"
                          />
                        </FormControl>
                        <FormDescription>
                          Your date of birth is used to calculate age-appropriate recommendations.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Gender */}
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Used to provide relevant nutritional guidelines.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Height */}
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Height in centimeters"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Your height in centimeters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Weight */}
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Weight in kilograms"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Your weight in kilograms.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Daily Physical Activity Goal */}
                  <FormField
                    control={form.control}
                    name="dailyPhysicalActivityGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Physical Activity Goal (minutes/day)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Goal in minutes per day"
                            min="1"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Recommended to be at least 30 minutes.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Medical History</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Heart Disease */}
                    <FormField
                      control={form.control}
                      name="heartDisease"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Heart Disease</FormLabel>
                            <FormDescription>
                              Do you have any heart disease?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Diabetes */}
                    <FormField
                      control={form.control}
                      name="diabetes"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Diabetes</FormLabel>
                            <FormDescription>
                              Do you have diabetes?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Family Heart Disease */}
                    <FormField
                      control={form.control}
                      name="familyHeartDisease"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Family History of Heart Disease</FormLabel>
                            <FormDescription>
                              Does heart disease run in your family?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Family Diabetes */}
                    <FormField
                      control={form.control}
                      name="familyDiabetes"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Family History of Diabetes</FormLabel>
                            <FormDescription>
                              Does diabetes run in your family?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Lifestyle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Smoking Status */}
                    <FormField
                      control={form.control}
                      name="smokingStatus"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Smoking</FormLabel>
                            <FormDescription>
                              Do you smoke?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Alcohol Consumption */}
                    <FormField
                      control={form.control}
                      name="alcoholConsumption"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Alcohol Consumption</FormLabel>
                            <FormDescription>
                              Do you consume alcohol?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Dietary Preferences</h3>
                  
                  {/* Dietary Restriction */}
                  <FormField
                    control={form.control}
                    name="dietaryRestriction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dietary Restriction</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select dietary restriction" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dietaryRestrictions.map((diet) => (
                              <SelectItem key={diet.value} value={diet.value}>
                                {diet.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select any dietary restriction you follow.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Food Allergies */}
                  <FormField
                    control={form.control}
                    name="foodAllergies"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Food Allergies</FormLabel>
                          <FormDescription>
                            Select all food allergies that apply to you.
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {allergies.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="foodAllergies"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value || [], item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="w-[100px]"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <span>Saving...</span>
                  ) : isEditMode ? (
                    "Update Profile"
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default ProfileForm; 
 
 