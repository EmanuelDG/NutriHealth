import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';

jest.mock('../../services/api', () => ({
  exerciseApi: {
    getDaily: jest.fn(() => Promise.resolve({ data: { total_minutes: 45, goal_minutes: 60 } }))
  },
  healthApi: {
    getHealthSummary: jest.fn(() => Promise.resolve({ 
      data: { height: 175, weight: 70, bmi: 22.9, classification: 'Healthy' } 
    })),
    getBmiHistory: jest.fn(() => Promise.resolve({ 
      data: [{ month: 'Jan', bmi: 23 }, { month: 'Feb', bmi: 22.9 }] 
    }))
  },
  userApi: {
    getProfile: jest.fn(() => Promise.resolve({ 
      data: { 
        name: 'Test User',
        username: 'testuser',
        height: 175,
        weight: 70
      } 
    }))
  },
  waterApi: {
    getTodayWater: jest.fn(() => Promise.resolve({ 
      data: { glasses: 6 },
      glasses: 6,
      source: 'api'
    })),
    addWaterChangeListener: jest.fn(() => {
      return jest.fn();
    }),
    _getTodayDate: jest.fn(() => new Date().toISOString().split('T')[0])
  },
  mealApi: {
    getLastMeal: jest.fn(() => Promise.resolve({ 
      data: { name: 'Breakfast', calories: 500 } 
    })),
    getMealHistory: jest.fn(() => Promise.resolve({ 
      data: [{ name: 'Breakfast', calories: 500, timestamp: new Date().toISOString() }] 
    }))
  },
  nutrientApi: {
    getDailyNutrients: jest.fn(() => Promise.resolve({ 
      data: { calories: 1500, protein: 60, carbs: 180, fats: 50 } 
    })),
    getNutrientTargets: jest.fn(() => Promise.resolve({
      data: { calories: 2000, protein: 90, carbs: 250, fats: 65, sugar: 25, fiber: 30 }
    }))
  }
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

jest.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}));

describe('Dashboard Component', () => {
  test('renders without crashing', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders BMI information', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('BMI Measurement')).toBeInTheDocument();
    
    expect(screen.getByText(/Your current Body Mass Index/)).toBeInTheDocument();
  });

  test('renders water intake tracking component', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Water Intake')).toBeInTheDocument();
    
    const buttons = screen.getAllByRole('button');
    const hasAddButton = buttons.some(button => 
      button.textContent.includes('+') || 
      button.getAttribute('aria-label')?.includes('add')
    );
    const hasRemoveButton = buttons.some(button => 
      button.textContent.includes('-') || 
      button.getAttribute('aria-label')?.includes('remove')
    );
    
    expect(hasAddButton || hasRemoveButton).toBe(true);
  });

  test('renders exercise logging functionality', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Daily Exercise')).toBeInTheDocument();
    
    expect(screen.getByText('Track your physical activity')).toBeInTheDocument();
    
    const logExerciseElements = screen.getAllByText('Log Exercise');
    expect(logExerciseElements.length).toBeGreaterThan(0);
  });
}); 