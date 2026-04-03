import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Login';

// Mock the API service
jest.mock('../../services/api', () => ({
  auth: {
    login: jest.fn(() => Promise.resolve({
      data: {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh-token'
      }
    }))
  }
}));

// Mock the toast notification
jest.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Simple function to render the component in tests
const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  test('renders without crashing', () => {
    renderLogin();
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('validates form fields correctly', async () => {
    renderLogin();
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    expect(screen.getByText(/please enter both username and password/i)).toBeInTheDocument();
  });

  test('disables button and shows loading text during submission, then enables after response', async () => {
    const apiMock = require('../../services/api');
    apiMock.auth.login.mockImplementationOnce(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: {
              access_token: 'fake-token',
              refresh_token: 'fake-refresh-token'
            }
          });
        }, 100); 
      })
    );
    
    renderLogin();
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(submitButton).not.toBeDisabled();
    expect(submitButton.textContent).toBe('Sign in');
    
    fireEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(submitButton.textContent).toBe('Signing in...');
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton.textContent).toBe('Sign in');
    });
  });

  test('calls API with correct data on form submission', async () => {
    const apiMock = require('../../services/api');
    renderLogin();
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    expect(apiMock.auth.login).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
      email: 'testuser'  
    });
  });

  test('displays error message when login fails', async () => {
    const apiMock = require('../../services/api');
    apiMock.auth.login.mockImplementationOnce(() => 
      Promise.reject({
        response: {
          status: 401,
          data: { detail: 'Invalid username or password' }
        }
      })
    );
    
    renderLogin();
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
  });
}); 