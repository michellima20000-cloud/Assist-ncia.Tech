import React, { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
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
        // If the server responded with 404 or text/html on an API route, try client fallback
        const contentType = res.headers.get("content-type") || "";
        if (res.status === 404 || contentType.includes("text/html")) {
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

// Global React Error Boundary for resilient user experience
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught runtime error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-blue-500/20 text-[#1E88E5] rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Restaurando o Sistema</h1>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            O aplicativo detectou uma inconsistência momentânea e está pronto para reiniciar de forma segura.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition"
            >
              Recarregar Sistema
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("user_session");
                localStorage.removeItem("user_token");
                window.location.href = "/";
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold border border-slate-700 cursor-pointer transition"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);
