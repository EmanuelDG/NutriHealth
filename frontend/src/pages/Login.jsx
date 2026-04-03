import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { Leaf } from 'lucide-react';
import api from '../services/api';

const AppLogo = () => (
  <div className="flex flex-col items-center mb-6">
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
      <Leaf className="h-10 w-10 text-primary animate-pulse" />
    </div>
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        NutriHealth
      </span>
      <span className="text-sm text-muted-foreground">
        Adaptive Health App
      </span>
    </div>
  </div>
);

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    
    // Form validation
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Attempting login with username: ${username}`);
      
      const response = await api.auth.login({ 
        username, 
        password,
        email: username 
      });
      
      console.log('Login successful!');
      console.log('Token received:', response.data.access_token ? 'Yes' : 'No');
      
      // Extract tokens from response
      const { access_token, refresh_token } = response.data;
      
      if (rememberMe) {
        localStorage.setItem('token', access_token);
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }
      } else {
        sessionStorage.setItem('token', access_token);
        if (refresh_token) {
          sessionStorage.setItem('refresh_token', refresh_token);
        }
      }
      
      // Check if user has completed their profile before
      const userKey = `user_${username}_profile_completed`;
      const hasCompletedProfile = localStorage.getItem(userKey) === 'true';
      
      const isReturningUser = localStorage.getItem('has_logged_in_before') === 'true';
      
      localStorage.setItem('has_logged_in_before', 'true');
      
      const shouldRedirectToProfile = !hasCompletedProfile && !isReturningUser;
      
      console.log(`User ${username} profile status:`, {
        hasCompletedProfileFlag: hasCompletedProfile,
        isReturningUser: isReturningUser,
        shouldRedirectToProfile: shouldRedirectToProfile
      });
      
      toast({
        title: "Login successful",
        description: shouldRedirectToProfile ? "Welcome! Please complete your profile." : "Welcome back!",
        variant: "success"
      });
      

      console.log('Using direct window.location.href navigation');
      setTimeout(() => {
        const redirectPath = shouldRedirectToProfile ? '/profile?mode=edit' : '/dashboard';
        console.log(`Redirecting user to: ${redirectPath}`);
        
        window.location.href = redirectPath;
      }, 500);
      
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error status:', err.response.status);
        console.error('Error headers:', err.response.headers);
      }
      
      if (err.response) {
        const statusCode = err.response.status;
        const errorDetail = err.response.data?.detail;
        
        if (statusCode === 401) {
          setError('Invalid username or password');
        } else if (statusCode === 422) {
          if (err.response.data?.detail) {
            if (Array.isArray(err.response.data.detail)) {
              const validationErrors = err.response.data.detail.map(
                error => `${error.loc.join('.')} - ${error.msg}`
              ).join('; ');
              setError(`Validation error: ${validationErrors || 'Invalid data format'}`);
            } else {
              setError(`${err.response.data.detail}`);
            }
          } else {
            setError('Invalid request format. Please check your input.');
          }
        } else if (errorDetail) {
          setError(errorDetail);
        } else {
          setError(`Error ${statusCode}: Please try again later.`);
        }
      } else if (err.request) {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/40">
      <div className="w-full max-w-md">
        <AppLogo />
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="LaraCroft" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember-me" 
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                  disabled={isLoading}
                />
                <Label 
                  htmlFor="remember-me" 
                  className="text-sm font-normal"
                >
                  Remember me
                </Label>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login; 
 
 