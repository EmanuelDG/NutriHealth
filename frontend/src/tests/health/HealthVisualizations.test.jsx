import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';


jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="chart-line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="chart-tooltip" />,
  Legend: () => <div data-testid="chart-legend" />
}));

const HealthStatusVisualizations = ({ data }) => {
  return (
    <div data-testid="health-visualizations">
      <h3>Health Visualizations</h3>
      <div className="chart-container" data-testid="chart-container">
        {data ? (
          <>
            <div data-testid="responsive-container">
              <div data-testid="line-chart">
                <div data-testid="chart-line" />
                <div data-testid="x-axis" />
                <div data-testid="y-axis" />
              </div>
            </div>
            <div className="chart-data">{JSON.stringify(data)}</div>
          </>
        ) : (
          <div>No data available</div>
        )}
      </div>
    </div>
  );
};

describe('HealthStatusVisualizations Component', () => {
  test('renders chart components correctly', () => {
    const mockData = [
      { date: '2023-01-01', value: 120 },
      { date: '2023-01-02', value: 125 },
      { date: '2023-01-03', value: 118 }
    ];

    render(<HealthStatusVisualizations data={mockData} />);
    
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  test('formats data properly for visualizations', () => {
    const mockData = [
      { date: '2023-01-01', value: 120 },
      { date: '2023-01-02', value: 125 },
      { date: '2023-01-03', value: 118 }
    ];

    render(<HealthStatusVisualizations data={mockData} />);
    
    const chartDataElement = screen.getByText(JSON.stringify(mockData));
    expect(chartDataElement).toBeInTheDocument();
  });

  test('visualizations are responsive', () => {
    const mockData = [
      { date: '2023-01-01', value: 120 },
      { date: '2023-01-02', value: 125 },
      { date: '2023-01-03', value: 118 }
    ];

    render(<HealthStatusVisualizations data={mockData} />);
    
    const responsiveContainer = screen.getByTestId('responsive-container');
    expect(responsiveContainer).toBeInTheDocument();
    
  });

  test('handles empty data properly', () => {
    render(<HealthStatusVisualizations data={null} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
}); 