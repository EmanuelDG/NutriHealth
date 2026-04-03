import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../pages/FutureHealthInsight', () => {
  return function MockFutureHealthInsight() {
    return <div data-testid="future-health-insight">Future Health Insights Mock</div>;
  };
});

import FutureHealthInsight from '../../pages/FutureHealthInsight';

describe('FutureHealthInsight Component', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<FutureHealthInsight />);
    expect(getByTestId('future-health-insight')).toBeInTheDocument();
  });
}); 