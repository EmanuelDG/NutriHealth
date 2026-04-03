import axios from 'axios';
export const checkServerHealth = async () => {
  try {
    // Get the API base URL from environment variables, with a fallback
    const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL 
      ? import.meta.env.VITE_API_BASE_URL 
      : 'http://localhost:8000';
    
    // Create a controller to allow timeout abortion
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    // Check if the server is responding - use /health instead of /health/check which returned 404
    const response = await axios.get(
      `${API_BASE_URL}/health`,
      {
        timeout: 3000, // 3 second timeout (backup)
        signal: controller.signal
      }
    );
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check for valid response 
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      console.error('Server health check timed out');
    } else {
      console.error('Server health check failed:', error.message);
    }
    
    if (error.response && error.response.status === 404) {
      console.log('Server is running but health endpoint returned 404, considering server available');
      return true;
    }
    
    return false;
  }
};

export const showServerErrorMessage = () => {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '20px';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translateX(-50%)';
  errorDiv.style.backgroundColor = '#ef4444';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '1rem';
  errorDiv.style.borderRadius = '0.375rem';
  errorDiv.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.maxWidth = '90%';
  errorDiv.style.textAlign = 'center';
  
  errorDiv.textContent = 'Cannot connect to the server. Please make sure the backend is running.';
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    if (document.body.contains(errorDiv)) {
      document.body.removeChild(errorDiv);
    }
  }, 7000);
};

window.addEventListener('DOMContentLoaded', async () => {
  const isServerRunning = await checkServerHealth();
  if (!isServerRunning) {
    showServerErrorMessage();
  }
});

export default {
  checkServerHealth,
  showServerErrorMessage
}; 