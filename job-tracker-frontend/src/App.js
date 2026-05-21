import React from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  return (
    <div className="App">
      <Dashboard />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
          },
          success: {
            iconTheme: { primary: '#059669', secondary: '#ffffff' },
          },
          error: {
            duration: 4000,
            iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
          },
        }}
      />
    </div>
  );
}

export default App;
