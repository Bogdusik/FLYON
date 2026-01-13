'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Global toast state
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastState: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toastState]));
}

export const toast = {
  success: (message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(7);
    toastState.push({ id, message, type: 'success', duration });
    notifyListeners();
  },
  error: (message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(7);
    toastState.push({ id, message, type: 'error', duration });
    notifyListeners();
  },
  warning: (message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(7);
    toastState.push({ id, message, type: 'warning', duration });
    notifyListeners();
  },
  info: (message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(7);
    toastState.push({ id, message, type: 'info', duration });
    notifyListeners();
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToasts(newToasts);
    };
    toastListeners.push(listener);
    setToasts([...toastState]);

    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const removeToast = (id: string) => {
    toastState = toastState.filter(t => t.id !== id);
    notifyListeners();
  };

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const duration = toast.duration || 4000;
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          background: 'rgba(34, 197, 94, 0.15)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          color: 'rgba(134, 239, 172, 0.9)',
        };
      case 'error':
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          color: 'rgba(252, 165, 165, 0.9)',
        };
      case 'warning':
        return {
          background: 'rgba(234, 179, 8, 0.15)',
          borderColor: 'rgba(234, 179, 8, 0.3)',
          color: 'rgba(253, 224, 71, 0.9)',
        };
      case 'info':
      default:
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          borderColor: 'rgba(59, 130, 246, 0.3)',
          color: 'rgba(147, 197, 253, 0.9)',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="glass-card rounded-lg px-4 py-3 min-w-[300px] max-w-[400px] border pointer-events-auto animate-slide-in-right"
      style={styles}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs sm:text-sm font-medium flex-1">{toast.message}</p>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-white/50 hover:text-white/80 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
