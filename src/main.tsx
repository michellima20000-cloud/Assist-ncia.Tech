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
      if (typeof (event as any).stopImmediatePropagation === 'function') {
        (event as any).stopImmediatePropagation();
      }
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isViteWSWarning(event.message) || isViteWSWarning(event.error) || isViteWSWarning(event.filename)) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof (event as any).stopImmediatePropagation === 'function') {
        (event as any).stopImmediatePropagation();
      }
    }
  }, true);
}

// Intercept fetch requests to handle /api routes cleanly with failover to client router
const originalFetch = window.fetch;
const interceptFetch = function (input: RequestInfo | URL, init?: RequestInit) {
  let urlStr = "";
  if (typeof input === "string") {
    urlStr = input;
  } else if (input instanceof URL) {
    urlStr = input.toString();
  } else if (input && typeof (input as any).url === "string") {
    urlStr = (input as any).url;
  }

  let pathname = "";
  try {
    pathname = urlStr.startsWith("http") ? new URL(urlStr).pathname : urlStr;
  } catch (e) {
    pathname = urlStr;
  }

  if (pathname.startsWith("/api/")) {
    return originalFetch(input, init)
      .then((res) => {
        // If the server responded with 404 on an API route, try client fallback
        if (res.status === 404) {
          return handleClientRoute(urlStr, init).catch(() => res);
        }
        return res;
      })
      .catch((err) => {
        console.warn("Backend API fetch failed, falling back to client router:", err);
        return handleClientRoute(urlStr, init);
      });
  }

  return originalFetch(input, init);
};

try {
  Object.defineProperty(window, "fetch", {
    value: interceptFetch,
    configurable: true,
    writable: true,
    enumerable: true,
  });
} catch (e) {
  try {
    (window as any).fetch = interceptFetch;
  } catch (err) {
    console.error("Failed to proxy window.fetch:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
