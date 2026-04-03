// Main application entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Filter out irrelevant browser extension errors
const originalConsoleError = console.error;
console.error = function(message, ...args) {
  // Check if this is a benign duplicate request error
  if (args.length > 0 && 
      args[0] && 
      typeof args[0] === 'object' && 
      args[0].code === 'ERR_DUPLICATE' && 
      args[0].isBenign) {
    // Don't log as error, use console.log instead
    console.log('Duplicate request handled:', args[0].message || 'Request canceled');
    return;
  }
  
  // Ignore browser extension related errors
  if (
    typeof message === 'string' && (
      message.includes('price_parity:pcp_begin') ||
      message.includes('message channel closed') ||
      message.includes('asynchronous response')
    )
  ) {
    return;
  }
  originalConsoleError.apply(console, [message, ...args]);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 
 