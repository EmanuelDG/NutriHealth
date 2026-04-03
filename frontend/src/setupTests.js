// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// see https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock import.meta for Vite environment variables
if (typeof globalThis.import === 'undefined') {
  globalThis.import = {};
}

if (typeof globalThis.import.meta === 'undefined') {
  globalThis.import.meta = {
    env: {
      VITE_API_BASE_URL: 'http://localhost:8000',
      MODE: 'test'
    }
  };
}

// Mock for CSS modules
// This is handled by react-scripts default configuration

// Mock for static assets
// This is handled by react-scripts default configuration

// Mock ResizeObserver
class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Do nothing
  }
  unobserve() {
    // Do nothing
  }
  disconnect() {
    // Do nothing
  }
}

// Add to global
global.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Do nothing
  }
  unobserve() {
    // Do nothing
  }
  disconnect() {
    // Do nothing
  }
}

// Add to global
global.IntersectionObserver = IntersectionObserverMock; 