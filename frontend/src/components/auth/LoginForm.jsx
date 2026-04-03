import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { authApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { isValidEmail, validateRequired, validatePassword } from '../../lib/validation';
import { useToast } from '../../hooks/use-toast';
import { Loader2 } from 'lucide-react';

// login form
const LoginForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { loading, execute: login } = useApi(authApi.login, {
    showErrorToast: true,
    showSuccessToast: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Check if username/email is provided
    const usernameResult = validateRequired(credentials.username, 'Username or email');
    if (!usernameResult.isValid) {
      newErrors.username = usernameResult.message;
    }
    
    // Check if password is provided
    const passwordResult = validateRequired(credentials.password, 'Password');
    if (!passwordResult.isValid) {
      newErrors.password = passwordResult.message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const result = await login(credentials);
    
    if (result.data) {
      // Store the token in localStorage or sessionStorage depending on rememberMe
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', result.data.access_token);
      
      toast({
        title: "Login Successful",
        description: "Redirecting to dashboard...",
        variant: "success",
      });
      
      // Navigate to the dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }
  };

  // render the login form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="username">Username or Email</Label>
        <Input
          id="username"
          name="username"
          type="text"
          value={credentials.username}
          onChange={handleChange}
          placeholder="Enter your username or email"
          className={errors.username ? "border-red-500" : ""}
          autoComplete="username"
          disabled={loading}
        />
        {errors.username && (
          <p className="text-sm text-red-500">{errors.username}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="password">Password</Label>
          <a 
            href="/forgot-password" 
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          value={credentials.password}
          onChange={handleChange}
          placeholder="Enter your password"
          className={errors.password ? "border-red-500" : ""}
          autoComplete="current-password"
          disabled={loading}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={setRememberMe}
          disabled={loading}
        />
        <Label
          htmlFor="remember"
          className="text-sm font-normal cursor-pointer"
        >
          Remember me
        </Label>
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <a href="/signup" className="text-primary hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </form>
  );
};

export default LoginForm; 