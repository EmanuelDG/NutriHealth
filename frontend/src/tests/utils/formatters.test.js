// create and test utility functions directly

// Date formatting
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatNumber = (number, decimals = 0) => {
  if (number === null || number === undefined) return '';
  return Number(number).toFixed(decimals);
};

const formatBMIClassification = (bmi) => {
  if (bmi === null || bmi === undefined) return 'Unknown';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

const transformHealthData = (healthData) => {
  if (!healthData || !Array.isArray(healthData) || healthData.length === 0) {
    return [];
  }
  
  return healthData.map(item => ({
    date: formatDate(item.date || item.timestamp),
    bmi: item.bmi ? formatNumber(item.bmi, 1) : '',
    classification: formatBMIClassification(item.bmi),
  }));
};

describe('Data Formatting Tests', () => {
  describe('Date Formatting', () => {
    test('formats date correctly', () => {
      const date = new Date('2023-05-15T10:00:00');
      expect(formatDate(date)).toBe('May 15, 2023');
    });

    test('handles invalid date', () => {
      expect(formatDate('invalid-date')).toBe('Invalid date');
    });

    test('handles null/undefined date', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('Number Formatting', () => {
    test('formats number with no decimals', () => {
      expect(formatNumber(123)).toBe('123');
    });

    test('formats number with specified decimals', () => {
      expect(formatNumber(123.456, 2)).toBe('123.46');
    });

    test('handles zero correctly', () => {
      expect(formatNumber(0)).toBe('0');
    });

    test('handles null/undefined values', () => {
      expect(formatNumber(null)).toBe('');
      expect(formatNumber(undefined)).toBe('');
    });
  });

  describe('Health Data Transformations', () => {
    test('transforms health data array correctly', () => {
      const mockHealthData = [
        { date: '2023-05-15T10:00:00', bmi: 22.5 },
        { timestamp: '2023-05-16T10:00:00', bmi: 27.8 }
      ];

      const transformed = transformHealthData(mockHealthData);
      
      expect(transformed.length).toBe(2);
      expect(transformed[0].date).toBe('May 15, 2023');
      expect(transformed[0].bmi).toBe('22.5');
      expect(transformed[0].classification).toBe('Normal');
      
      expect(transformed[1].date).toBe('May 16, 2023');
      expect(transformed[1].bmi).toBe('27.8');
      expect(transformed[1].classification).toBe('Overweight');
    });

    test('handles empty health data array', () => {
      expect(transformHealthData([])).toEqual([]);
    });

    test('handles null/undefined health data', () => {
      expect(transformHealthData(null)).toEqual([]);
      expect(transformHealthData(undefined)).toEqual([]);
    });

    test('handles health data with missing fields', () => {
      const mockHealthData = [
        { date: '2023-05-15T10:00:00' }, // Missing BMI
        { timestamp: '2023-05-16T10:00:00', bmi: null } // Null BMI
      ];

      const transformed = transformHealthData(mockHealthData);
      
      expect(transformed.length).toBe(2);
      expect(transformed[0].bmi).toBe('');
      expect(transformed[0].classification).toBe('Unknown');
      
      expect(transformed[1].bmi).toBe('');
      expect(transformed[1].classification).toBe('Unknown');
    });
  });
}); 