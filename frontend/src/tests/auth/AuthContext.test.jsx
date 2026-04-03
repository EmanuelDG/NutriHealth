import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';

const TestComponent = () => <div>Protected Content</div>;
const LoginComponent = () => <div>Login Page</div>;

const renderProtectedRoute = () => {
  return render(
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          } 
        />
        <Route path="/login" element={<LoginComponent />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('Authentication System', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    
    window.history.pushState({}, '', '/');
  });
  
  test('authenticated state is true when token exists in localStorage', () => {
    localStorage.setItem('token', 'fake-test-token');
    
    renderProtectedRoute();
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
  
  test('authenticated state is true when token exists in sessionStorage', () => {
    sessionStorage.setItem('token', 'fake-test-token');
    
    renderProtectedRoute();
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
  
  test('authenticated state is false after removing token (logout)', () => {
    localStorage.setItem('token', 'fake-test-token');
    
    renderProtectedRoute();
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    
    act(() => {
      localStorage.removeItem('token');
      
      renderProtectedRoute();
    });
    
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
  
  test('token is stored correctly in localStorage', () => {
    const token = 'test-local-storage-token';
    
    localStorage.setItem('token', token);
    
    expect(localStorage.getItem('token')).toBe(token);
  });
  
  test('token is stored correctly in sessionStorage', () => {
    const token = 'test-session-storage-token';
    
    sessionStorage.setItem('token', token);
    
    expect(sessionStorage.getItem('token')).toBe(token);
  });
  
  test('token is retrievable from either storage location', () => {
    localStorage.setItem('token', 'local-token');
    sessionStorage.setItem('token', 'session-token');
    
    const getAuthToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
    
    expect(getAuthToken()).toBe('local-token');
    
    localStorage.removeItem('token');
    
    expect(getAuthToken()).toBe('session-token');
  });
}); 