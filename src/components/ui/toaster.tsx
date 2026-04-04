import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle2, XCircle } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isSuccess = props.variant === 'success';
        const isError = props.variant === 'destructive';

        const icon = isSuccess
          ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          : isError
            ? <XCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
            : null;

        const toastClass = isSuccess
          ? 'bg-green-50 dark:bg-green-950/50 border-none border-l-4 border-l-green-500 dark:border-l-green-400 text-foreground'
          : isError
            ? 'bg-red-50 dark:bg-red-950/50 border-none border-l-4 border-l-red-500 dark:border-l-red-400 text-foreground'
            : '';

        return (
          <Toast key={id} {...props} className={toastClass}>
            <div className="flex items-start gap-3">
              {icon}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
