import React from 'react';
import { Navigate } from 'react-router-dom';

// simple auth check - looks for token in storage
const isAuthenticated = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return !!token;
};

const ProtectedRoute = ({ children }) => {
  const auth = isAuthenticated();
  
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute; 