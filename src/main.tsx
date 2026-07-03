import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept all fetch requests to route /api to the Cloud Run backend when running on external domains like Vercel
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    value: function (input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        const isExternalDomain = window.location.hostname !== 'localhost' && 
                                 !window.location.hostname.includes('us-east1.run.app');
        if (isExternalDomain) {
          const backendUrl = 'https://ais-pre-3juews5vwpb63yyq5fou6i-408064427062.us-east1.run.app';
          input = `${backendUrl}${input}`;
        }
      }
      return originalFetch(input, init);
    },
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Could not override window.fetch with Object.defineProperty, trying direct assignment:", e);
  try {
    (window as any).fetch = function (input: any, init: any) {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        const isExternalDomain = window.location.hostname !== 'localhost' && 
                                 !window.location.hostname.includes('us-east1.run.app');
        if (isExternalDomain) {
          const backendUrl = 'https://ais-pre-3juews5vwpb63yyq5fou6i-408064427062.us-east1.run.app';
          input = `${backendUrl}${input}`;
        }
      }
      return originalFetch(input, init);
    };
  } catch (err) {
    console.error("Failed to proxy window.fetch:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
