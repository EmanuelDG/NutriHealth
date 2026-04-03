import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignUp from '../../pages/SignUp';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

jest.mock('../../services/api', () => ({
  auth: {
    signup: jest.fn(() => Promise.resolve({ data: { message: 'User registered successfully' } })),
    login: jest.fn(() => Promise.resolve({
      data: {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh-token'
      }
    }))
  }
}));

jest.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

const renderSignUp = () => {
  return render(
    <BrowserRouter>
      <SignUp />
    </BrowserRouter>
  );
};

const fillFormWithValidData = () => {
  fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Lara Croft' } });
  fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'laracroft' } });
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'lara@example.com' } });
  fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '1234567890' } });
  fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123!' } });
  fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Password123!' } });
};

describe('SignUp Component', () => {
  const apiMock = require('../../services/api');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    renderSignUp();
    
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  test('validates form fields correctly', async () => {
    renderSignUp();
    
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'invalid-email' } });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    expect(screen.getByText('Email is invalid')).toBeInTheDocument();
    
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'short' } });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });
  
  test('validates password matching', async () => {
    renderSignUp();
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Lara Croft' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'laracroft' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'lara@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'DifferentPassword123!' } });
    
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    renderSignUp();
    
    fillFormWithValidData();
    
    const nameInput = screen.getByLabelText(/Full Name/i);
    const usernameInput = screen.getByLabelText(/Username/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
    
    expect(nameInput.value).toBe('Lara Croft');
    expect(usernameInput.value).toBe('laracroft');
    expect(emailInput.value).toBe('lara@example.com');
    expect(phoneInput.value).toBe('1234567890');
    expect(passwordInput.value).toBe('Password123!');
    expect(confirmPasswordInput.value).toBe('Password123!');
  });

  test('navigates to login page when clicking sign in link', () => {
    renderSignUp();
    
    const signInLink = screen.getByText('Sign in');
    fireEvent.click(signInLink);
    
    expect(signInLink.closest('a')).toHaveAttribute('href', '/login');
  });
}); 