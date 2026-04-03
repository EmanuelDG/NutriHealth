import { useState, useCallback, useEffect } from 'react';
import { handleApiError } from '../services/api';
import { useToast } from '../components/ui/use-toast';

/**
 * Custom hook for making API calls with loading state and error handling
 * 
 * @param {Function} apiMethod - The API method to call
 * @param {Object} options - Configuration options
 * @param {boolean} options.loadOnMount - Whether to make the API call when the component mounts
 * @param {any} options.defaultData - Default data before API call
 * @param {boolean} options.showErrorToast - Whether to show error toast notifications
 * @param {boolean} options.showSuccessToast - Whether to show success toast notifications
 * @param {string} options.successMessage - Custom success message
 * @param {Array} options.dependencies - Dependencies to watch for auto-loading
 * 
 * @returns {Object} - API call state and control methods
 */
export const useApi = (
  apiMethod,
  {
    loadOnMount = false,
    defaultData = null,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage = 'Operation completed successfully',
    dependencies = []
  } = {}
) => {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiMethod(...args);
      const result = response.data;
      
      setData(result);
      
      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: successMessage,
          variant: 'success',
        });
      }
      
      return { data: result, response };
    } catch (err) {
      const errorObj = handleApiError(err);
      setError(errorObj);
      
      if (showErrorToast) {
        toast({
          title: 'Error',
          description: errorObj.message,
          variant: 'destructive',
        });
      }
      
      return { error: errorObj };
    } finally {
      setLoading(false);
    }
  }, [apiMethod, showErrorToast, showSuccessToast, successMessage, toast]);

  // Load data on mount if specified
  useEffect(() => {
    if (loadOnMount) {
      execute();
    }
  }, [loadOnMount, execute, ...dependencies]);

  return {
    data,
    loading,
    error,
    execute,
    setData,
    reset: useCallback(() => {
      setData(defaultData);
      setError(null);
    }, [defaultData])
  };
};

export default useApi; 