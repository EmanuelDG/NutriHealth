import axios from 'axios';
import { checkServerHealth } from '../utils/serverChecker';


const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) 
  ? import.meta.env.VITE_API_BASE_URL 
  : 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, 
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add basic request interceptor to handle authentication
apiClient.interceptors.request.use(
  (config) => {
    // Ensure method is valid and lowercase
    if (!config.method || typeof config.method !== 'string') {
      config.method = 'get';
    } else {
      config.method = config.method.toLowerCase();
    }
    
    // Ensure URL is defined
    if (!config.url) {
      config.url = '';
    }
    
    // Ensure headers exist
    if (!config.headers) {
      config.headers = {};
    }
    
    // Get token from storage - try multiple possible keys
    let token = localStorage.getItem('token');
    if (!token) {
      token = localStorage.getItem('access_token');
    }
    if (!token) {
      token = sessionStorage.getItem('token');
    }
    if (!token) {
      token = sessionStorage.getItem('access_token');
    }
    
    // Check if token looks valid
    const isTokenValid = token && typeof token === 'string' && token.split('.').length === 3;
    
    console.log(`Token check for ${config.url}:`, {
      isValid: isTokenValid,
      exists: Boolean(token),
      length: token ? token.length : 0,
      parts: token ? token.split('.').length : 0
    });
    
    if (isTokenValid) {
      // Add token to request headers
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log(`Request interceptor: Adding token to request for ${config.url}`, {
        tokenExists: Boolean(token),
        tokenLength: token?.length,
        method: config.method,
        url: config.url
      });
    } else {
      console.warn(`No valid authentication token found for request to ${config.url}.`, {
        tokenExists: Boolean(token),
        tokenType: typeof token,
        tokenParts: token ? token.split('.').length : 0
      });
      
      if (config.url.includes('/users/profile') && 
          window.location.pathname !== '/login' && 
          !window.location.pathname.includes('/profile')) {
        console.error('No valid token for profile request - redirecting to login');
        setTimeout(() => {
          window.location.href = '/login?from=profile&invalid_token=true';
        }, 500);
      }
    }
    
    for (const endpoint in timeoutSettings) {
      if (config.url && config.url.includes(endpoint)) {
        config.timeout = timeoutSettings[endpoint];
        break;
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    try {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout: The server took too long to respond';
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Network error: Could not connect to the server';
      }
      
      if (error.response) {
        const status = error.response.status;
        
        if (status === 404) {
          const url = error.config ? error.config.url : 'Unknown URL';
          const isExpectedMissingEndpoint = url.includes('/users/bmi-history') || 
                                           url.includes('/water/today') ||
                                           url.includes('/water/log');
          
          if (isExpectedMissingEndpoint) {
            console.warn(`Resource not found but expected (404): ${url}`);
          } else {
            console.error(`Resource not found (404): ${url}`);
          }
          
          error.message = `Resource not found: ${error.config.url.split('/').pop()}`;
        } else if (status === 422) {
          let detailMessage = 'Invalid data format';
          
          if (error.response.data?.detail) {
            if (typeof error.response.data.detail === 'string') {
              detailMessage = error.response.data.detail;
            } else if (Array.isArray(error.response.data.detail)) {
              detailMessage = error.response.data.detail.map(err => 
                `${err.loc.join('.')}: ${err.msg}`
              ).join('; ');
            }
          }
          
          console.error(`Validation error (422): ${detailMessage}`);
          error.message = `Validation error: ${detailMessage}`;
        } else if (status >= 500) {
          console.error(`Server error (${status}): ${error.response.data?.detail || 'Server error'}`);
          error.message = `Server error (${status}): Please try again later`;
        }
      }
      
      if (error.response && error.response.status === 401) {
        console.log('Unauthorized access attempt - redirecting to login');
        localStorage.removeItem('token');
        if (!error.config.url.includes('/search') && 
            !window.location.pathname.includes('/profile')) {
          window.location.href = '/login';
        }
      }
    } catch (handlerError) {
      console.error('Error in response error interceptor:', handlerError);
    }
    
    return Promise.reject(error);
  }
);

let apiAvailable = null;
let isApiAvailable = null; 
let apiCheckTimestamp = null;
const API_CHECK_COOLDOWN = 60 * 1000; 

const checkApiAvailability = async () => {
  try {
    const now = Date.now();
    if (isApiAvailable !== null && apiCheckTimestamp && (now - apiCheckTimestamp < API_CHECK_COOLDOWN)) {
      console.log(`API check on cooldown. Last check: ${isApiAvailable ? 'Available' : 'Unavailable'}`);
      return isApiAvailable;
    }
    
    apiCheckTimestamp = now;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    apiAvailable = await checkServerHealth();
    isApiAvailable = apiAvailable;
    
    clearTimeout(timeoutId);
    console.log(`Initial API check result: ${apiAvailable ? 'Available' : 'Unavailable'}`);
    
    return apiAvailable;
  } catch (error) {
    console.error('API health check failed:', error);
    apiAvailable = false;
    isApiAvailable = false;
    return false;
  }
};

checkApiAvailability();

export default apiClient;
export { apiAvailable, checkApiAvailability };

const pendingRequests = {};

export const checkBackendStatus = checkApiAvailability;

const timeoutSettings = {
  '/auth/login': 5000,
  '/auth/register': 5000,
  '/auth/verify': 5000,
  '/auth/forgot-password': 5000,
  '/auth/reset-password': 5000,
  '/auth/refresh': 5000,
  '/users/profile': 5000,
  '/users/preferences': 5000,
  '/users/update': 5000,
  '/users/password': 5000,
  '/users/preferences': 5000,
  '/users/me': 5000,
  '/meals/recent': 5000,
  '/meals/search': 30000,
  '/meals/analyze': 10000,
  '/health/summary': 5000,
  '/health/history': 5000,
  '/health/goals': 5000,
  '/health/activity-trends': 5000,
  '/health/nutrition-trends': 5000,
  '/health/daily-nutrients': 5000,
  '/health/status': 5000,
  '/health/classify': 10000,
  '/health/log': 5000,
  '/health/nutrient-targets': 5000,
  '/health/update-nutrient-targets': 5000,
  '/exercise/recent': 5000,
  '/exercise/stats': 5000,
  '/exercise/history': 10000,
  '/exercise/daily': 5000,
  '/exercise/log': 5000,
  '/recommendations': 5000,
  '/recommendations/health': 5000,
  '/recommendations/debug': 5000,
  '/recommendations/dislike': 5000,
  '/water/history': 5000,
  '/water/today': 5000,
  '/water/log': 5000,
  '/nutrients/targets': 5000,
  '/nutrients/history': 5000,
  '/future-insights': 30000,          
  '/future-insights/generate': 60000, 
  '/future-insights/test': 5000,      
};

// request deduplication to prevent duplicate in-flight requests
apiClient.interceptors.request.use(
  (config) => {
    if (config.method === 'get') {
      if (config.allowDuplicate) {
        console.log(`Allowing duplicate request: ${config.url}`);
        return config;
      }
      
      const requestId = `${config.method}:${config.url}`;
      
      const now = Date.now();
      
      const hasDuplicateRequest = pendingRequests[requestId] && 
                                 (now - pendingRequests[requestId].timestamp < 100);
      
      if (hasDuplicateRequest && !config.allowDuplicate) {
        console.log(`Blocking duplicate request: ${requestId}`);
        
        return Promise.reject({
          message: 'Duplicate request canceled',
          name: 'DuplicateRequest',
          code: 'ERR_DUPLICATE',
          config,
          isBenign: true
        });
      }
      
      pendingRequests[requestId] = {
        timestamp: now
      };
      
      config.finallyHandler = () => {
        setTimeout(() => {
          delete pendingRequests[requestId];
        }, 150);
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


apiClient.interceptors.response.use(
  (response) => {
    if (response.config.finallyHandler) {
      response.config.finallyHandler();
    }
    return response;
  },
  (error) => {
    if (error.config && error.config.finallyHandler) {
      error.config.finallyHandler();
    }
    
    if (error.code === 'ERR_DUPLICATE' && error.isBenign) {
      console.log(`Duplicate request prevented: ${error.config ? error.config.url : 'unknown'}`);
      return Promise.reject(error);
    }
    
    try {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout: The server took too long to respond';
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Network error: Could not connect to the server';
      }
      
      if (error.response) {
        const status = error.response.status;
        
        if (status === 404) {
          const url = error.config ? error.config.url : 'Unknown URL';
          const isExpectedMissingEndpoint = url.includes('/users/bmi-history') || 
                                           url.includes('/water/today') ||
                                           url.includes('/water/log');
          
          if (isExpectedMissingEndpoint) {
            console.warn(`Resource not found but expected (404): ${url}`);
          } else {
            console.error(`Resource not found (404): ${url}`);
          }
          
          error.message = `Resource not found: ${error.config.url.split('/').pop()}`;
        } else if (status === 422) {
          let detailMessage = 'Invalid data format';
          
          if (error.response.data?.detail) {
            if (typeof error.response.data.detail === 'string') {
              detailMessage = error.response.data.detail;
            } else if (Array.isArray(error.response.data.detail)) {
              detailMessage = error.response.data.detail.map(err => 
                `${err.loc.join('.')}: ${err.msg}`
              ).join('; ');
            }
          }
          
          console.error(`Validation error (422): ${detailMessage}`);
          error.message = `Validation error: ${detailMessage}`;
        } else if (status >= 500) {
          console.error(`Server error (${status}): ${error.response.data?.detail || 'Server error'}`);
          error.message = `Server error (${status}): Please try again later`;
        }
      }
      
      if (error.response && error.response.status === 401) {
        console.log('Unauthorized access attempt - redirecting to login');
        localStorage.removeItem('token');
        if (!error.config.url.includes('/search') && 
            !window.location.pathname.includes('/profile')) {
          window.location.href = '/login';
        }
      }
    } catch (handlerError) {
      console.error('Error in response error interceptor:', handlerError);
    }
    
    return Promise.reject(error);
  }
);

export const safeToUpperCase = (str) => {
  if (!str) {
    return 'GET'; 
  }
  
  if (typeof str !== 'string') {
    console.warn('Attempted to call toUpperCase on non-string value:', str);
    try {
      return String(str).toUpperCase();
    } catch (e) {
      console.error('Error converting value to string for toUpperCase:', e);
      return 'GET'; 
    }
  }
  
  try {
    return str.toUpperCase();
  } catch (e) {
    console.error('Unexpected error in toUpperCase:', e);
    return 'GET'; 
  }
};


axios.interceptors.request.use(
  (config) => {
      if (!config.method || typeof config.method !== 'string') {
      config.method = 'get';
    } else {
      config.method = config.method.toLowerCase();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

console.log('API client configured with baseURL:', apiClient.defaults.baseURL); 
 
 