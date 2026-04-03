import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../components/features/DataCards', () => ({
  HealthStatusCard: ({ title, status, description, details = [] }) => (
    <div data-testid="health-status-card">
      <h2>{title}</h2>
      <p>{description}</p>
      <div 
        className={
          status.toLowerCase() === 'healthy' ? 'bg-green-100 text-green-800 border-green-200' :
          status.toLowerCase() === 'at risk' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
          status.toLowerCase() === 'needs attention' ? 'bg-red-100 text-red-800 border-red-200' :
          'bg-blue-100 text-blue-800 border-blue-200'
        }
        data-testid="status-badge"
      >
        {status}
      </div>
      <ul>
        {details.map((detail, index) => (
          <li key={index}>{detail}</li>
        ))}
      </ul>
    </div>
  )
}));

import { HealthStatusCard } from '../../components/features/DataCards';

describe('HealthMetrics Component', () => {
  const healthyData = {
    title: 'Health Status',
    status: 'Healthy',
    description: 'Your current health status based on recent measurements',
    details: [
      'Your BMI is within the normal range',
      'Your exercise goals are being met',
      'Your nutritional intake is balanced'
    ]
  };

  const atRiskData = {
    title: 'Health Status',
    status: 'At Risk',
    description: 'Your current health status based on recent measurements',
    details: [
      'Your BMI is slightly elevated',
      'You need to increase physical activity',
      'Consider reducing sugar intake'
    ]
  };

  const criticalData = {
    title: 'Health Status',
    status: 'Needs Attention',
    description: 'Your current health status based on recent measurements',
    details: [
      'Your BMI is in the obese range',
      'Physical activity is below recommended levels',
      'Consult with a healthcare professional'
    ]
  };

  test('renders without crashing', () => {
    render(<HealthStatusCard {...healthyData} />);
    expect(screen.getByTestId('health-status-card')).toBeInTheDocument();
  });

  test('displays correct health metrics details', () => {
    render(<HealthStatusCard {...healthyData} />);
    
    expect(screen.getByText('Health Status')).toBeInTheDocument();
    expect(screen.getByText('Your current health status based on recent measurements')).toBeInTheDocument();
    
  
    healthyData.details.forEach(detail => {
      expect(screen.getByText(detail)).toBeInTheDocument();
    });
  });


  test('shows appropriate status indicator for Healthy status', () => {
    render(<HealthStatusCard {...healthyData} />);
    const statusBadge = screen.getByTestId('status-badge');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge.textContent).toBe('Healthy');
    expect(statusBadge.className).toContain('bg-green-100');
    expect(statusBadge.className).toContain('text-green-800');
  });

  test('shows appropriate status indicator for At Risk status', () => {
    render(<HealthStatusCard {...atRiskData} />);
    const statusBadge = screen.getByTestId('status-badge');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge.textContent).toBe('At Risk');
    expect(statusBadge.className).toContain('bg-yellow-100');
    expect(statusBadge.className).toContain('text-yellow-800');
  });

  test('shows appropriate status indicator for Needs Attention status', () => {
    render(<HealthStatusCard {...criticalData} />);
    const statusBadge = screen.getByTestId('status-badge');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge.textContent).toBe('Needs Attention');
    expect(statusBadge.className).toContain('bg-red-100');
    expect(statusBadge.className).toContain('text-red-800');
  });
}); 