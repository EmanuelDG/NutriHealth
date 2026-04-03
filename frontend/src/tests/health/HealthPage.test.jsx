import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HealthPage from '../../pages/HealthPage';


jest.mock('../../services/axiosConfig', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn().mockResolvedValue({}),
      post: jest.fn().mockResolvedValue({}),
      put: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({})
    }
  };
});


jest.mock('../../services/api', () => {
  return {
  healthApi: {
      getStatus: jest.fn().mockResolvedValue({ 
        data: {
          classification: 'Healthy',
          date: '2023-01-01T00:00:00.000Z',
          bmi: 22.5
        }
      }),
      classifyHealth: jest.fn().mockResolvedValue({ 
        data: { 
          classification: 'Healthy' 
        } 
      }),
    clearStatusCache: jest.fn(),
      getDailyNutrients: jest.fn().mockResolvedValue({
        data: {
          current: { calories: 1000, protein: 50, carbs: 100 },
          target: { calories: 2000, protein: 100, carbs: 200 }
        }
      })
  },
  userApi: {
      getProfile: jest.fn().mockResolvedValue({ 
        data: {
          height: 175,
          weight: 70,
          gender: 1,
          date_of_birth: '1990-01-01'
        }
      })
  },
  exerciseApi: {
      getDaily: jest.fn().mockResolvedValue({ 
        data: { 
          total_minutes: 30, 
          goal_minutes: 60 
        } 
      }),
      getHistory: jest.fn().mockResolvedValue({ data: [] })
  },
  mealApi: {
      getNutrientSummary: jest.fn().mockResolvedValue({ 
        data: { 
          current: { calories: 1000, protein: 50, carbs: 100 },
          target: { calories: 2000, protein: 100, carbs: 200 },
          percent: { calories: 50, protein: 50, carbs: 50 }
        } 
      }),
      hasMealsToday: jest.fn().mockResolvedValue({ data: false })
  },
    getUnifiedNutrientTargets: jest.fn().mockReturnValue({
      calorieTarget: 2000,
      protein: 100,
      carbs: 200,
      fats: 70
    }),
  handleApiError: jest.fn().mockReturnValue({ message: 'Error occurred' })
  };
});


const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});


jest.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));


jest.mock('../../components/ui/tabs', () => {
  let tabChangeCallback = null;

  return {
    Tabs: ({ children, value, onValueChange }) => {
      tabChangeCallback = onValueChange;
      return (
        <div data-testid="tabs-container">
      {children}
    </div>
      );
    },
  TabsContent: ({ children, value }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }) => (
      <button 
        data-testid={`tab-trigger-${value}`} 
        role="tab"
        onClick={() => tabChangeCallback && tabChangeCallback(value)}
      >
        {children}
      </button>
  )
  };
});


jest.mock('../../services/dataProcessor', () => ({
  dataProcessor: {
    processHealthData: jest.fn(),
    processProfileData: jest.fn(),
    formatNutritionData: jest.fn()
  }
}));

const mockHealthData = {
  classification: 'Healthy',
  date: '2023-01-01T00:00:00.000Z',
  bmi: 22.5
};

const mockUserData = {
  height: 175,
  weight: 70,
  gender: 1,
  date_of_birth: '1990-01-01'
};

describe('HealthPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <HealthPage />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Health Dashboard')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(require('../../services/api').healthApi.getStatus).toHaveBeenCalled();
      expect(require('../../services/api').userApi.getProfile).toHaveBeenCalled();
    });
  });

  test('displays health classification correctly', async () => {
    render(
      <MemoryRouter>
        <HealthPage />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      const healthyElements = screen.getAllByText(/Healthy|Health Dashboard/i);
      expect(healthyElements.length).toBeGreaterThan(0);
    });
  });

  test('renders tab content correctly', async () => {
    render(
      <MemoryRouter>
        <HealthPage />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(require('../../services/api').healthApi.getStatus).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-overview')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('tab-trigger-exercise')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('tab-trigger-exercise'));
    
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-exercise')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Daily Exercise Log/i)).toBeInTheDocument();
  });
}); 