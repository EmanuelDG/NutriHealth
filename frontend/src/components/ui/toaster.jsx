import { useToast } from "../../hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast"
import React from "react"

export function Toaster() {
  const { toasts } = useToast()
  
  // Add a cleanup effect when toasts change
  React.useEffect(() => {
    // Force clean up any stale toast elements that might be causing blur issues
    const cleanup = () => {
      const staleToasts = document.querySelectorAll('[data-radix-toast-root][data-state="closed"]');
      staleToasts.forEach(toast => toast.remove());
    };
    
    // Clean up after animations complete
    const timer = setTimeout(cleanup, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [toasts]);

  return (
    <ToastProvider swipeDirection="up">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className="gap-3 p-6 sm:max-w-[450px] rounded-lg" />
    </ToastProvider>
  );
}
