import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from '../ui/toaster';
import { useToast } from '../ui/use-toast';
import api from '../../services/api';
import axios from 'axios';

const AppLayout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasAttemptedFetch = useRef(false);
  
  // load user data only once
  useEffect(() => {

    if (hasAttemptedFetch.current || userData) {
      return;
    }
    
    hasAttemptedFetch.current = true;
    
    const checkAuthAndLoadUser = async () => {
      try {
        // check if user is authenticated
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
          console.log('No authentication token found');
          navigate('/login');
          return;
        }
        
        console.log('Fetching user profile...');
        
        try {
          // Add a timeout to the request to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await api.user.getProfile();
          clearTimeout(timeoutId);
          
          console.log('User profile loaded successfully');
          setUserData(response.data);
          setLoading(false);
        } catch (apiError) {
          console.error('API error:', apiError);
          // Redirect to login if profile can't be loaded
          setError('Failed to load user profile');
          setLoading(false);
          
          toast({
            title: 'Authentication Error',
            description: 'Please log in again to continue',
            variant: 'destructive'
          });
          
          // Clear token and redirect
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error in auth check:', error);
        setError('Authentication error');
        setLoading(false);
        
        // redirect on auth errors or other errors
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to continue',
          variant: 'destructive'
        });
        
        navigate('/login');
      }
    };
    
    checkAuthAndLoadUser();
  }, [toast, userData, navigate]);
  
  // handle auth errors globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && [401, 403].includes(error.response.status)) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          
          if (window.location.pathname !== '/login') {
            toast({
              title: 'Session Expired',
              description: 'Please log in again to continue',
              variant: 'destructive'
            });
            navigate('/login');
          }
        }
        return Promise.reject(error);
      }
    );
    
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate, toast]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out',
      variant: 'default'
    });
    
    navigate('/login');
  };
  
  // show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  // error message but still render the layout
  if (error && !userData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <div className="text-destructive text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // main layout
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar 
        userName={typeof userData?.name === 'string' && userData?.name !== 'string' ? userData?.name : userData?.username || 'User'}
        userEmail={userData?.email || ''}
        userImage={userData?.image || null}
        onLogout={handleLogout}
      />
      
      <main className="lg:ml-64 transition-all duration-300 min-h-screen">
        <div className="container p-4">
          <Outlet />
        </div>
      </main>
      
      <Toaster />
    </div>
  );
};

export default AppLayout; 