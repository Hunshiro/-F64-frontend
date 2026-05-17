import React, { createContext, useContext, useMemo, useState } from "react";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type Toast = { id: string; message: string; action?: ToastAction };

type NotifyInput = string | { message: string; action?: ToastAction };

const ToastContext = createContext<{ notify: (input: NotifyInput) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (input: NotifyInput) => {
    const payload = typeof input === "string" ? { message: input } : input;
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message: payload.message, action: payload.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  };

  const value = useMemo(() => ({ notify }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="card px-4 py-2 text-sm flex items-center gap-3">
            <div className="flex-1">{t.message}</div>
            {t.action && (
              <button className="px-2 py-1 rounded-lg border text-xs" onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
