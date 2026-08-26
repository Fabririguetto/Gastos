"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

interface ToastContextType {
  showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
};

const COLORS = {
  success: { bg: "#0d2e1a", border: "#00e87a", text: "#00e87a" },
  error: { bg: "#2d1010", border: "#ef4444", text: "#ef4444" },
  warning: { bg: "#2d1f00", border: "#f59e0b", text: "#f59e0b" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "90px",
          right: "16px",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-end",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const c = COLORS[toast.type];
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                animation: "slideUp 0.2s ease-out",
                maxWidth: "min(320px, calc(100vw - 32px))",
                pointerEvents: "auto",
                boxShadow: `0 4px 24px ${c.border}20`,
              }}
            >
              <Icon size={16} color={c.text} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: "14px", fontWeight: "600", color: c.text, flex: 1 }}>
                {toast.message}
              </p>
              <button
                onClick={() => dismiss(toast.id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: c.text, opacity: 0.6, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
