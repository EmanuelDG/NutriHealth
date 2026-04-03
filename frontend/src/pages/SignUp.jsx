import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import api from '../services/api';

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[0-9+\s()-]{10,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else {
      // Check for password complexity requirements
      if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter';
      } else if (!/[a-z]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one lowercase letter';
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one digit';
      } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one special character';
      }
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSubmitError('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { confirmPassword, ...apiData } = formData;
      
      await api.auth.signup({
        ...apiData,
        phone_number: apiData.phoneNumber
      });
      
      try {
        const loginResponse = await api.auth.login({
          username: apiData.username,
          password: apiData.password,
          email: apiData.email
        });
        
        const { access_token, refresh_token } = loginResponse.data;
        
        localStorage.setItem('token', access_token);
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }
        
        localStorage.setItem('has_logged_in_before', 'true');
        
        const userKey = `user_${apiData.username}_profile_completed`;
        localStorage.removeItem(userKey);
        
        console.log('Automatic login successful after signup');
      } catch (loginError) {
        console.error('Error during automatic login after signup:', loginError);
      }
      
      toast({
        title: "Account created successfully",
        description: "You can now complete your profile",
        variant: "success"
      });
      
      navigate('/profile?mode=edit');
      
    } catch (err) {
      console.error('Signup error:', err);
      
      if (err.response) {
        if (err.response.status === 400) {
          if (err.response.data.detail) {
            setSubmitError(err.response.data.detail);
          } else {
            setSubmitError('Please check your information and try again.');
          }
        } else if (err.response.status === 409) {
          setSubmitError('Email or username already exists. Please try another.');
        } else if (err.response.status === 422) {
          if (err.response.data.detail && Array.isArray(err.response.data.detail)) {
            const validationError = err.response.data.detail[0];
            if (validationError.loc && validationError.loc.length > 1) {
              const fieldName = validationError.loc[1];
              setSubmitError(`${fieldName}: ${validationError.msg}`);
            } else {
              setSubmitError(validationError.msg);
            }
          } else {
            setSubmitError('Please check that all fields meet the requirements.');
          }
        } else {
          setSubmitError('An error occurred during sign up. Please try again.');
        }
      } else if (err.request) {
        setSubmitError('No response from server. Please check your connection.');
      } else {
        setSubmitError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/40 py-8">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Create an account to get personalized dietary recommendations
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {submitError && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                  {submitError}
                </div>
              )}
              
              {/* Name field */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Lara Croft"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-destructive text-xs mt-1">{errors.name}</p>
                )}
              </div>
              
              {/* Username field */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Lara Croft"
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && (
                  <p className="text-destructive text-xs mt-1">{errors.username}</p>
                )}
              </div>
              
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  name="email"
                  type="email"
                  placeholder="lara.croft@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email}</p>
                )}
              </div>
              
              {/* Phone number field */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input 
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={errors.phoneNumber ? "border-destructive" : ""}
                />
                {errors.phoneNumber && (
                  <p className="text-destructive text-xs mt-1">{errors.phoneNumber}</p>
                )}
              </div>
              
              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password ? (
                  <p className="text-destructive text-xs mt-1">{errors.password}</p>
                ) : (
                  <p className="text-muted-foreground text-xs mt-1">
                    Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.
                  </p>
                )}
              </div>
              
              {/* Confirm password field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
              
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SignUp; 
 
 