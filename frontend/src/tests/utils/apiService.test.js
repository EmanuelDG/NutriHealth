import axios from 'axios';
import apiClient from '../../services/axiosConfig';
import { authApi, userApi } from '../../services/api';

jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    }))
  };
});

jest.mock('../../services/axiosConfig', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

describe('API Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    if (userApi.clearCache) {
      userApi.clearCache();
    }
  });

  describe('API Request Formatting', () => {
    test('login request correctly formats data as form URL-encoded', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { access_token: 'test-token' } });

      const result = await authApi.login({ username: 'testuser', password: 'password123' });
      
      expect(apiClient.post.mock.calls[0][0]).toBe('/auth/login');
      
      const params = apiClient.post.mock.calls[0][1];
      expect(params instanceof URLSearchParams).toBe(true);
      
      const config = apiClient.post.mock.calls[0][2];
      expect(config.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(result.data.access_token).toBe('test-token');
    });

    test('register request sends JSON data', async () => {
      const userData = { 
        name: 'Test User', 
        email: 'test@example.com', 
        password: 'password123' 
      };

      apiClient.post.mockResolvedValueOnce({ data: { message: 'User registered' } });

      await authApi.register(userData);
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/signup', userData);
    });
  });

  describe('API Response Handling', () => {
    test('getProfile correctly processes the successful API response', async () => {
      const mockProfileData = { 
        id: 1, 
        name: 'Test User', 
        email: 'test@example.com' 
      };

      apiClient.get.mockResolvedValueOnce({ data: mockProfileData });

      const result = await userApi.getProfile();
      
      expect(result.data).toEqual(mockProfileData);
    });
  });

  describe('API Error Handling', () => {
    test('handles authentication errors appropriately', async () => {
      const authError = { 
        response: { 
          status: 401, 
          data: { detail: 'Invalid credentials' } 
        } 
      };
      
      apiClient.post.mockRejectedValueOnce(authError);

      await expect(authApi.login({ 
        username: 'testuser', 
        password: 'wrongpassword' 
      })).rejects.toEqual(authError);
    });

    test('handles network errors appropriately', async () => {
      const networkError = { 
        code: 'ERR_NETWORK',
        message: 'Network Error' 
      };
      
      userApi.clearCache();
      
      apiClient.get.mockRejectedValueOnce(networkError);

      try {
        await userApi.getProfile();
        fail('Expected getProfile to reject with network error');
      } catch (error) {
        expect(error).toEqual(networkError);
      }
    });
  });
}); 