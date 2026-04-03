import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
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

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    

    setError('');
    
  
    if (!email) {
      setError('Please enter your email address');
      return;
    }

  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    // simulate API call
    try {
      setIsLoading(true);
      console.log(`Attempting password reset for email: ${email}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      
      toast({
        title: "Reset link sent",
        description: "If an account exists with that email, a password reset link has been sent.",
        variant: "success"
      });
      
    } catch (err) {
      console.error('Password reset error:', err);
      
      setIsSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "If an account exists with that email, a password reset link has been sent.",
        variant: "success"
      });
    } finally {
      setIsLoading(false);
    }
  };


  if (isSubmitted) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-muted/40">
        <div className="w-full max-w-md">
          <AppLogo />
          <Card className="shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Check Your Email</CardTitle>
              <CardDescription className="text-center">
                A password reset link has been sent to your email address
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-4 text-center">
              <p className="text-muted-foreground">
                If an account exists with the email <strong>{email}</strong>, you will receive a password reset link shortly.
              </p>
              <p className="text-muted-foreground">
                Please check your inbox and spam folders.
              </p>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Return to Login
              </Button>
              
              <div className="text-center text-sm">
                Didn't receive an email?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto" 
                  onClick={() => setIsSubmitted(false)}
                >
                  Try again
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/40">
      <div className="w-full max-w-md">
        <AppLogo />
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email address to receive a password reset link
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
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your.email@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
              
              <div className="text-center text-sm">
                Remember your password?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword; 