import { createContext, FC, ReactNode, useCallback, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  txSig?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string, txSig?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let nextId = 0;

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, txSig?: string) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, type, title, message, txSig }]);
    setTimeout(() => dismiss(id), type === 'error' ? 8000 : 5000);
  }, [dismiss]);

  const icons: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  const borders: Record<ToastType, string> = {
    success: 'border-green-500 bg-green-900/40',
    error: 'border-red-500 bg-red-900/40',
    info: 'border-blue-500 bg-blue-900/40',
  };

  const textColors: Record<ToastType, string> = {
    success: 'text-green-300',
    error: 'text-red-300',
    info: 'text-blue-300',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-sm transition-all ${borders[toast.type]}`}
          >
            <span className="text-xl mt-0.5 shrink-0">{icons[toast.type]}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${textColors[toast.type]}`}>{toast.title}</p>
              {toast.message && (
                <p className="text-slate-400 text-xs mt-1 break-words">{toast.message}</p>
              )}
              {toast.txSig && (
                <a
                  href={`https://explorer.solana.com/tx/${toast.txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 inline-block break-all"
                >
                  Ver en Solana Explorer →
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-slate-500 hover:text-slate-300 text-lg leading-none shrink-0 transition"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
