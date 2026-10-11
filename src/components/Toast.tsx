import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 pointer-events-none">
        <div className="space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl shadow-lg border p-4 flex items-start gap-3 animate-slide-up ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200'
                  : t.type === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-sky-50 border-sky-200'
              }`}
            >
              {t.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              )}
              {t.type === 'error' && (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              {t.type === 'info' && (
                <AlertCircle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm font-medium flex-1 ${
                  t.type === 'success'
                    ? 'text-emerald-800'
                    : t.type === 'error'
                      ? 'text-red-800'
                      : 'text-sky-800'
                }`}
              >
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                className={`flex-shrink-0 rounded-lg p-0.5 transition-colors ${
                  t.type === 'success'
                    ? 'text-emerald-400 hover:bg-emerald-100'
                    : t.type === 'error'
                      ? 'text-red-400 hover:bg-red-100'
                      : 'text-sky-400 hover:bg-sky-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
