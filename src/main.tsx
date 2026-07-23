import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleClientRoute } from './lib/clientRouter.ts';

// Silence benign dev-only Vite HMR WebSocket connection errors from triggering popups or noise
if (typeof window !== 'undefined') {
  const isViteWSWarning = (err: unknown): boolean => {
    if (!err) return false;
    const str = typeof err === 'string' ? err : (err as any)?.message || (err as any)?.stack || String(err);
    if (typeof str !== 'string') return false;
    const lower = str.toLowerCase();
    return (
      lower.includes("websocket") ||
      lower.includes("vite") ||
      lower.includes("hmr") ||
      lower.includes("ws://") ||
      lower.includes("wss://") ||
      lower.includes("closed without") ||
      lower.includes("closed before")
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isViteWSWarning(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isViteWSWarning(event.message) || isViteWSWarning(event.error) || isViteWSWarning(event.filename)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

// Intercept all fetch requests to route /api to the Cloud Run backend when running on external domains like Vercel
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    value: function (input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        const isExternalDomain = window.location.hostname !== 'localhost' && 
                                 !window.location.hostname.includes('us-east1.run.app');
        if (isExternalDomain) {
          // Talk directly to Firestore on the client side to avoid CORS, cold start, and fetch errors on Vercel
          return handleClientRoute(input, init);
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
          return handleClientRoute(input, init);
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
