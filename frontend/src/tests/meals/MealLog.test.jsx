import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MealLog from '../../pages/MealLog';

jest.mock('../../services/api', () => ({
  mealApi: {
    searchFoods: jest.fn().mockResolvedValue({
      data: {
        results: [
          { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
          { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.4 }
        ]
      }
    }),
    logMeal: jest.fn().mockResolvedValue({ 
      data: { 
        success: true,
        id: '3',
        name: 'Test Meal',
        calories: 400
      } 
    }),
    getMealHistory: jest.fn().mockResolvedValue({
      data: [
        { id: '1', name: 'Breakfast', calories: 500, timestamp: '2023-06-15T08:00:00Z' },
        { id: '2', name: 'Lunch', calories: 700, timestamp: '2023-06-15T12:00:00Z' }
      ]
    }),
    deleteMeal: jest.fn().mockResolvedValue({ data: { success: true } }),
    editMeal: jest.fn().mockResolvedValue({ data: { success: true } })
  },
  waterApi: {
    getWaterHistory: jest.fn().mockResolvedValue({
      data: [
        { id: '1', amount: 250, timestamp: '2023-06-15T08:00:00Z' },
        { id: '2', amount: 300, timestamp: '2023-06-15T12:00:00Z' }
      ]
    })
  },
  userApi: {
    getProfile: jest.fn().mockResolvedValue({
      data: {
        id: '123',
        name: 'Test User',
        email: 'test@example.com'
      }
    })
  }
}));

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

global.dispatchEvent = jest.fn();
global.CustomEvent = jest.fn();

describe('MealLog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <MealLog />
        </BrowserRouter>
      );
    });
    
    expect(screen.getByText('Meal Log')).toBeInTheDocument();
    expect(screen.getByText('Track your food and water intake')).toBeInTheDocument();
    
    expect(screen.getByRole('tab', { name: /log a meal/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /meal history/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /water intake/i })).toBeInTheDocument();
  });

  test('has clickable tab elements', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <MealLog />
        </BrowserRouter>
      );
    });
    
    const logMealTab = screen.getByRole('tab', { name: /log a meal/i });
    const historyTab = screen.getByRole('tab', { name: /meal history/i });
    const waterTab = screen.getByRole('tab', { name: /water intake/i });
    
    expect(logMealTab).toBeInTheDocument();
    expect(historyTab).toBeInTheDocument();
    expect(waterTab).toBeInTheDocument();
    
    expect(logMealTab).not.toBeDisabled();
    expect(historyTab).not.toBeDisabled();
    expect(waterTab).not.toBeDisabled();
  });

  test('has working search input field', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <MealLog />
        </BrowserRouter>
      );
    });

    const searchInput = screen.getByPlaceholderText('Search for a food...');
    expect(searchInput).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'apple' } });
    });
    
    expect(searchInput.value).toBe('apple');
  });

  test('displays manual meal entry form', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <MealLog />
        </BrowserRouter>
      );
    });
    
    expect(screen.getByText('Manual Entry')).toBeInTheDocument();
    
    const formInputs = screen.getAllByRole('textbox');
    expect(formInputs.length).toBeGreaterThan(0);
    
    const buttons = screen.getAllByRole('button');
    const submitButton = buttons.find(button => 
      button.textContent.toLowerCase().includes('log') || 
      button.textContent.toLowerCase().includes('add')
    );
    expect(submitButton).toBeTruthy();
  });

  test('tab panels exist in document', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <MealLog />
        </BrowserRouter>
      );
    });
    
    const tabPanel = screen.getByRole('tabpanel');
    expect(tabPanel).toBeInTheDocument();
    
    expect(tabPanel.querySelector('div')).not.toBeNull();
  });
}); 