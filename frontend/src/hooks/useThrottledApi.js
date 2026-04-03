import { useRef, useEffect, useState } from 'react';
import { useApi } from './useApi';

/**
 * Custom hook for making API calls with throttling to prevent excessive calls
 * 
 * @param {Function} apiMethod - The API method to call
 * @param {Object} options - Configuration options
 * @param {boolean} options.loadOnMount - Whether to make the API call when the component mounts
 * @param {any} options.defaultData - Default data before API call
 * @param {boolean} options.showErrorToast - Whether to show error toast notifications
 * @param {boolean} options.showSuccessToast - Whether to show success toast notifications
 * @param {string} options.successMessage - Custom success message
 * @param {Array} options.dependencies - Dependencies to watch for auto-loading
 * @param {number} options.throttleMs - Throttle time in milliseconds (default: 5000ms)
 * 
 * @returns {Object} - API call state and control methods
 */
export const useThrottledApi = (
  apiMethod,
  {
    loadOnMount = false,
    defaultData = null,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage = 'Operation completed successfully',
    dependencies = [],
    throttleMs = 5000
  } = {}
) => {

  const lastCallTimeRef = useRef(0);
  const [isThrottled, setIsThrottled] = useState(false);
  
  const apiHook = useApi(
    apiMethod,
    {
      loadOnMount: false,
      defaultData,
      showErrorToast,
      showSuccessToast,
      successMessage,
      dependencies: []
    }
  );
  
  const throttledExecute = (...args) => {
    const now = Date.now();
    
    if (now - lastCallTimeRef.current < throttleMs) {
      console.log('API call throttled:', apiMethod?.name || 'unnamed method');
      setIsThrottled(true);
      return Promise.resolve({ throttled: true, data: apiHook.data });
    }
    
    lastCallTimeRef.current = now;
    setIsThrottled(false);
    
    return apiHook.execute(...args);
  };
  
  useEffect(() => {
    if (loadOnMount && !isThrottled) {
      throttledExecute();
    }
  }, [loadOnMount, ...dependencies]);
  
  return {
    ...apiHook,
    execute: throttledExecute,
    isThrottled
  };
};

export default useThrottledApi; 