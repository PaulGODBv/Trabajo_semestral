import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

export default function Toast() {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" role="region" aria-label="Notificaciones" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || Info
        return (
          <div key={toast.id} className={`toast toast--${toast.type}`} role="alert">
            <Icon className="toast__icon" size={20} aria-hidden="true" />
            <p className="toast__message">{toast.message}</p>
            <button type="button" className="toast__close" onClick={() => removeToast(toast.id)} aria-label="Cerrar notificación">
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
