import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastsState: ToastItem[] = [];
const listeners: Set<ToastListener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener([...toastsState]));
}

export const toast = {
  show: (message: string, type: ToastType = "info", duration = 3500) => {
    const id = "t-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const newToast: ToastItem = { id, message, type, duration };
    toastsState = [...toastsState, newToast];
    notifyListeners();

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
    return id;
  },
  success: (message: string, duration = 3500) => toast.show(message, "success", duration),
  error: (message: string, duration = 4500) => toast.show(message, "error", duration),
  info: (message: string, duration = 3500) => toast.show(message, "info", duration),
  warning: (message: string, duration = 4000) => toast.show(message, "warning", duration),
  dismiss: (id: string) => {
    toastsState = toastsState.filter((t) => t.id !== id);
    notifyListeners();
  },
  clear: () => {
    toastsState = [];
    notifyListeners();
  }
};

// Safe polyfill for window.alert inside iframe
if (typeof window !== "undefined") {
  (window as any).__originalAlert = window.alert;
  window.alert = (msg?: any) => {
    const text = String(msg || "");
    if (text.toLowerCase().includes("erro") || text.toLowerCase().includes("falha")) {
      toast.error(text);
    } else if (text.toLowerCase().includes("sucesso") || text.includes("✅")) {
      toast.success(text);
    } else if (text.toLowerCase().includes("atenção") || text.toLowerCase().includes("aviso")) {
      toast.warning(text);
    } else {
      toast.info(text);
    }
  };
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: ToastListener = (newToasts) => {
      setToasts(newToasts);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4">
      {toasts.map((t) => {
        let bg = "bg-slate-900 border-slate-700 text-white";
        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />;

        if (t.type === "success") {
          bg = "bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40";
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
        } else if (t.type === "error") {
          bg = "bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/40";
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
        } else if (t.type === "warning") {
          bg = "bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/40";
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
        } else {
          bg = "bg-slate-900/95 border-blue-500/50 text-slate-100 shadow-slate-950/40";
          icon = <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${bg}`}
          >
            {icon}
            <div className="flex-1 text-xs font-medium leading-relaxed whitespace-pre-line select-text">
              {t.message}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
