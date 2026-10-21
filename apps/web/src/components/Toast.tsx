"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** Confirmação passageira no canto inferior, pílula ink. Erros ficam no campo. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[96px] z-[60] flex justify-center px-4 md:bottom-6 md:justify-start md:pl-7">
        {message && (
          <div className="pointer-events-auto rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white">{message}</div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
