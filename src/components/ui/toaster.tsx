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
          ? <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#52C41A' }} />
          : isError
            ? <XCircle className="h-5 w-5 shrink-0" style={{ color: '#FF4D4F' }} />
            : null;

        const toastStyle = isSuccess
          ? { backgroundColor: '#F6FFED', border: 'none', borderLeft: '4px solid #52C41A' }
          : isError
            ? { backgroundColor: '#FFF2F0', border: 'none', borderLeft: '4px solid #FF4D4F' }
            : undefined;

        return (
          <Toast key={id} {...props} style={toastStyle}>
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
