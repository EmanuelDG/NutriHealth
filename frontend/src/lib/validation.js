/**
 * Utility functions for form and data validation
 */

/**
 * Validates an email address format
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with isValid flag and message
 */
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { 
      isValid: false, 
      message: 'Password must be at least 8 characters long' 
    };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one number' 
    };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one special character' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validates a form field is not empty
 * @param {string} value - The value to check
 * @param {string} fieldName - Name of the field for the error message
 * @returns {Object} Validation result with isValid flag and message
 */
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { 
      isValid: false, 
      message: `${fieldName} is required` 
    };
  }
  return { isValid: true };
};

/**
 * Validates a number is within a specified range
 * @param {number} value - The number to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Name of the field for the error message
 * @returns {Object} Validation result with isValid flag and message
 */
export const validateNumberRange = (value, min, max, fieldName) => {
  const numberValue = Number(value);
  
  if (isNaN(numberValue)) {
    return { 
      isValid: false, 
      message: `${fieldName} must be a number` 
    };
  }
  
  if (numberValue < min) {
    return { 
      isValid: false, 
      message: `${fieldName} must be at least ${min}` 
    };
  }
  
  if (numberValue > max) {
    return { 
      isValid: false, 
      message: `${fieldName} must be no more than ${max}` 
    };
  }
  
  return { isValid: true };
};

/**
 * Validates BMI is within a healthy range and provides additional context
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @returns {Object} Validation result with BMI value, category and message
 */
export const validateBMI = (weight, height) => {
  if (!weight || !height) {
    return {
      isValid: false,
      message: 'Both weight and height are required to calculate BMI'
    };
  }
  
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  
  let category;
  if (bmi < 18.5) {
    category = 'Underweight';
  } else if (bmi < 25) {
    category = 'Healthy Weight';
  } else if (bmi < 30) {
    category = 'Overweight';
  } else {
    category = 'Obesity';
  }
  
  return {
    isValid: true,
    bmi: bmi.toFixed(1),
    category,
    message: `Your BMI is ${bmi.toFixed(1)} (${category})`
  };
};

/**
 * Validates health features data before submitting to classification
 * @param {Object} healthData - The health data object to validate
 * @returns {Object} Validation result with isValid flag and errors
 */
export const validateHealthData = (healthData) => {
  const errors = {};
  
  // Validate required fields
  if (!healthData.age) errors.age = 'Age is required';
  if (!healthData.gender) errors.gender = 'Gender is required';
  if (!healthData.bmi) errors.bmi = 'BMI is required';
  if (healthData.daily_activity === undefined) errors.daily_activity = 'Daily activity is required';
  
  // Validate numeric ranges
  if (healthData.age && (healthData.age < 18 || healthData.age > 100)) {
    errors.age = 'Age must be between 18 and 100';
  }
  
  if (healthData.bmi && (healthData.bmi < 10 || healthData.bmi > 50)) {
    errors.bmi = 'BMI value appears to be outside normal range';
  }
  
  if (healthData.daily_activity && healthData.daily_activity < 0) {
    errors.daily_activity = 'Daily activity cannot be negative';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  isValidEmail,
  validatePassword,
  validateRequired,
  validateNumberRange,
  validateBMI,
  validateHealthData
}; 