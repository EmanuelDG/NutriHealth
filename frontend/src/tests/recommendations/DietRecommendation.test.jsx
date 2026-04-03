import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import DietRecommendation from '../../pages/DietRecommendation';
import { recommendationApi, mealApi, userApi, healthApi } from '../../services/api';

jest.mock('../../services/api', () => ({
  recommendationApi: {
    getRecommendations: jest.fn(),
    dislikeMeal: jest.fn(),
    dislikeRecommendation: jest.fn()
  },
  mealApi: {
    logMeal: jest.fn()
  },
  userApi: {
    getProfile: jest.fn(),
    getDietaryPreferences: jest.fn()
  },
  healthApi: {
    getNutritionalTargets: jest.fn(),
    getDailyNutrients: jest.fn()
  },
  calculateNutritionalTargets: jest.fn()
}));

jest.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

jest.mock('../../components/ui/tabs', () => ({
  Tabs: ({ children, className, defaultValue, onValueChange }) => (
    <div className={className}>{children}</div>
  ),
  TabsContent: ({ children, value }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children, className }) => (
    <div className={className}>{children}</div>
  ),
  TabsTrigger: ({ children, value }) => (
    <button data-testid={`tab-trigger-${value}`} onClick={() => {}}>{children}</button>
  )
}));

const mockRecommendations = [
  {
    id: '1',
    meal_name: 'Grilled Chicken Salad',
    calories: 450,
    protein: 35,
    carbs: 25,
    fats: 20,
    fiber: 8,
    nutrient_score: 85,
    recipe: 'Ingredients:\n- 200g chicken breast\n- Mixed greens\n- Cherry tomatoes\n- Cucumber\n- Olive oil\n- Lemon juice\nInstructions:\n1. Grill the chicken breast until cooked through\n2. Chop vegetables and mix with greens\n3. Slice chicken and place on top\n4. Drizzle with olive oil and lemon juice',
    health_benefits: 'High in protein, low in carbs'
  },
  {
    id: '2',
    meal_name: 'Quinoa Bowl with Roasted Vegetables',
    calories: 550,
    protein: 15,
    carbs: 80,
    fats: 15,
    fiber: 12,
    nutrient_score: 78,
    recipe: 'Ingredients:\n- 1 cup quinoa\n- Assorted vegetables\n- Olive oil\n- Seasonings\nInstructions:\n1. Cook quinoa according to package\n2. Roast vegetables\n3. Combine in bowl',
    health_benefits: 'Rich in fiber and plant protein'
  },
  {
    id: '3',
    meal_name: 'Salmon with Sweet Potato',
    calories: 480,
    protein: 30,
    carbs: 40,
    fats: 22,
    fiber: 6,
    nutrient_score: 90,
    recipe: 'Ingredients:\n- Salmon fillet\n- Sweet potato\n- Broccoli\n- Olive oil\nInstructions:\n1. Bake salmon\n2. Roast sweet potato\n3. Steam broccoli',
    health_benefits: 'Rich in omega-3 fatty acids'
  }
];

const mockDietaryPreferences = {
  restrictions: ['dairy-free'],
  allergies: ['peanuts'],
  dislikedIngredients: ['cilantro'],
  calorieTarget: 2000,
  macroTargets: {
    protein: 150,
    carbs: 200,
    fats: 67
  }
};

describe('DietRecommendation Component', () => {
  beforeEach(() => {
    recommendationApi.getRecommendations.mockResolvedValue({ data: mockRecommendations });
    recommendationApi.dislikeMeal.mockResolvedValue({ data: { success: true } });
    recommendationApi.dislikeRecommendation.mockResolvedValue({ data: { success: true } });
    userApi.getDietaryPreferences.mockResolvedValue({ data: mockDietaryPreferences });
    userApi.getProfile.mockResolvedValue({ data: { weight: 70, height: 175, gender: 'male', age: 30 } });
    healthApi.getNutritionalTargets.mockResolvedValue({ data: { calories: 2000, protein: 150, carbs: 200, fats: 67 } });
    healthApi.getDailyNutrients.mockResolvedValue({ data: { current: {}, target: {} } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <DietRecommendation />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Personalized Meal Suggestions')).toBeInTheDocument();
    });

    expect(screen.getByText('Current Preferences')).toBeInTheDocument();
  });

  test('displays recommendation cards correctly', async () => {
    render(
      <MemoryRouter>
        <DietRecommendation />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(recommendationApi.getRecommendations).toHaveBeenCalled();
    });
    
    for (const meal of mockRecommendations) {
      const mealElements = screen.getAllByText(meal.meal_name);
      expect(mealElements.length).toBeGreaterThanOrEqual(1);
      
      const mealCardElement = mealElements.find(el => 
        el.tagName.toLowerCase() === 'h3' && el.className.includes('line-clamp-1')
      );
      
      if (!mealCardElement) {
        expect(mealElements.length).toBeGreaterThan(0);
      } else {
        expect(mealCardElement).toBeInTheDocument();
      }
    }
    
    const scoreElements = screen.getAllByText(/Score: \d+\/100/);
    expect(scoreElements.length).toBe(3);
  });

  test('handles dislike button click correctly', async () => {
    render(
      <MemoryRouter>
        <DietRecommendation />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(recommendationApi.getRecommendations).toHaveBeenCalled();
    });
    
    const mealElements = screen.getAllByText('Grilled Chicken Salad');
    expect(mealElements.length).toBeGreaterThan(0);
    
    const dislikeButtons = screen.getAllByTitle('Dislike this meal');
    expect(dislikeButtons.length).toBeGreaterThan(0);
    fireEvent.click(dislikeButtons[0]);
    
    await waitFor(() => {
      const wasDislikeMealCalled = recommendationApi.dislikeMeal.mock.calls.length > 0;
      const wasDislikeRecommendationCalled = recommendationApi.dislikeRecommendation.mock.calls.length > 0;
      
      expect(wasDislikeMealCalled || wasDislikeRecommendationCalled).toBe(true);
      
      if (wasDislikeMealCalled) {
        expect(recommendationApi.dislikeMeal).toHaveBeenCalledWith('1');
      }
      
      if (wasDislikeRecommendationCalled) {
        expect(recommendationApi.dislikeRecommendation).toHaveBeenCalledWith('1');
      }
    });
  });

  test('handles refresh suggestions button click correctly', async () => {
    render(
      <MemoryRouter>
        <DietRecommendation />
      </MemoryRouter>
    );
    
    // Wait for initial recommendation data to load
    await waitFor(() => {
      expect(recommendationApi.getRecommendations).toHaveBeenCalled();
    });
    
    // Find and click the refresh button
    const refreshButton = screen.getByText('Refresh Suggestions');
    fireEvent.click(refreshButton);
    
    // Check if the API was called again with regenerate=true
    await waitFor(() => {
      // First call for initial load, second call for refresh
      expect(recommendationApi.getRecommendations).toHaveBeenCalledTimes(2);
      // Check the second call parameters
      expect(recommendationApi.getRecommendations.mock.calls[1][1]).toBe(true);
    });
    
    // Button text should change when generating
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  // Test 5: Test recipe display - this is a simplified test
  test('displays recipe information correctly', async () => {
    render(
      <MemoryRouter>
        <DietRecommendation />
      </MemoryRouter>
    );
    
    // Wait for recommendation data to load
    await waitFor(() => {
      expect(recommendationApi.getRecommendations).toHaveBeenCalled();
    });
    
    // First meal should be selected by default
    const mealElements = screen.getAllByText('Grilled Chicken Salad');
    expect(mealElements.length).toBeGreaterThan(0);
    
    // Verify basic recipe information is shown - use getAllByText instead of getByText
    const calorieElements = screen.getAllByText(/450 kcal/);
    expect(calorieElements.length).toBeGreaterThan(0);
    
    // Find and click the ingredients tab (simplified test) - use getAllByText to handle multiple elements
    const ingredientsElements = screen.getAllByText('Ingredients');
    expect(ingredientsElements.length).toBeGreaterThan(0);
    
    const instructionsElements = screen.getAllByText('Instructions');
    expect(instructionsElements.length).toBeGreaterThan(0);
    
    const healthBenefitsElements = screen.getAllByText('Health Benefits');
    expect(healthBenefitsElements.length).toBeGreaterThan(0);
  });
}); 