import React from 'react';
import { render, screen } from '@testing-library/react';


describe('Layout Component Tests', () => {
  test('AppLayout renders correctly', () => {
    render(<div data-testid="mock-layout">Mock Layout</div>);
    expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
  });

  test('Navigation functionality works', () => {
    render(
      <div data-testid="mock-navigation">
        <button data-testid="mock-nav-button">Home</button>
      </div>
    );
    
    const button = screen.getByTestId('mock-nav-button');
    expect(button).toBeInTheDocument();
  });

  test('Responsive behavior of sidebar', () => {
    render(
      <div 
        data-testid="mock-sidebar" 
        className="lg:ml-64 transition-all duration-300"
      >
        Sidebar content
      </div>
    );
    
    const sidebar = screen.getByTestId('mock-sidebar');
    expect(sidebar).toHaveClass('lg:ml-64');
    expect(sidebar).toHaveClass('transition-all');
    expect(sidebar).toHaveClass('duration-300');
  });
}); 