import { createContext, useCallback, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './Toast';
import type { Toast as ToastType, ToastContextValue, ToastProviderProps } from './Toast.types';
import styles from './Toast.module.css';

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children, position = 'bottom-right' }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const idPrefix = useId();

  const addToast = useCallback(
    (toast: Omit<ToastType, 'id'>) => {
      const id = `${idPrefix}-${Date.now()}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      return id;
    },
    [idPrefix]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const positionClass = position.replace('-', '') as keyof typeof styles;

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className={`${styles.container} ${styles[positionClass]}`}>
            {toasts.map((toast) => (
              <Toast key={toast.id} {...toast} onDismiss={removeToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
