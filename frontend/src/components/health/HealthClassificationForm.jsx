import React, { useEffect, useState } from 'react';
import { useThrottledApi } from '../../hooks/useThrottledApi';
import { userApi } from '../../services/api';
import { healthApi } from '../../services/api';
import { validateHealthData, validateBMI } from '../../lib/validation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const HealthClassificationForm = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    bmi: '',
    daily_activity: 30,
    heart_disease: false,
    diabetes: false,
    smoking: false,
    alcohol: false,
    protein_intake: 75,
    carbs_intake: 250
  });
  const [formErrors, setFormErrors] = useState({});
  const [calculatedBMI, setCalculatedBMI] = useState(null);
  
  // API hooks - now properly inside the component
  const { 
    loading: profileLoading, 
    error: profileError, 
    data: profileData,
    execute: fetchProfile 
  } = useThrottledApi(userApi.getProfile, {
    loadOnMount: true,
    showErrorToast: true,
    throttleMs: 5000 // Throttle calls to the profile API to once every 5 seconds
  });
  
  const { 
    loading: classifyLoading, 
    error: classifyError, 
    data: classificationResult, 
    execute: classifyHealth 
  } = useThrottledApi(healthApi.classifyHealth, {
    showErrorToast: true,
    successMessage: 'Health classification completed successfully'
  });
  
  // Load user profile and prefill form when available
  useEffect(() => {
    if (profileData) {
      setUserProfile(profileData);
      
      // Calculate age from date of birth if available
      let age = '';
      if (profileData.date_of_birth) {
        const dob = new Date(profileData.date_of_birth);
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        // Adjust age if birthday hasn't occurred yet this year
        if (today.getMonth() < dob.getMonth() || 
            (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
          age--;
        }
      }
      
      // Calculate BMI if weight and height are available
      let bmi = '';
      if (profileData.weight && profileData.height) {
        const heightInMeters = profileData.height / 100;
        bmi = (profileData.weight / (heightInMeters * heightInMeters)).toFixed(1);
        setCalculatedBMI({
          value: bmi,
          weight: profileData.weight,
          height: profileData.height
        });
      }
      
      // Prefill the form with user data
      setFormData({
        age: age || '',
        gender: profileData.gender || '',
        bmi: bmi || '',
        daily_activity: profileData.daily_physical_activity || 30,
        heart_disease: profileData.heart_disease || false,
        diabetes: profileData.diabetes || false,
        smoking: profileData.smoking_status || false,
        alcohol: profileData.alcohol_consumption || false,
        protein_intake: 75, 
        carbs_intake: 250
      });
    }
  }, [profileData]);
  
  // validate form data before submission
  const validateForm = () => {
    // Validate form data before submission
    const validationResult = validateHealthData(formData);
    
    if (!validationResult.isValid) {
      setFormErrors(validationResult.errors);
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Convert form data to the expected format
    const healthFeatures = {
      age: parseInt(formData.age),
      gender: parseInt(formData.gender),
      bmi: parseFloat(formData.bmi),
      daily_activity: parseInt(formData.daily_activity),
      heart_disease: formData.heart_disease,
      diabetes: formData.diabetes,
      smoking: formData.smoking,
      alcohol: formData.alcohol,
      protein_intake: parseFloat(formData.protein_intake),
      carbs_intake: parseFloat(formData.carbs_intake)
    };
    
    // Submit to the classification API
    await classifyHealth(healthFeatures);
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Health Classification</CardTitle>
        <CardDescription>
          Analyze your health status based on your personal health data
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {profileLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your profile data...</span>
          </div>
        ) : (
          <div>Form content goes here</div>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthClassificationForm; 