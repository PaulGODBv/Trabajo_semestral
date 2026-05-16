import { useToast } from '../context/ToastContext'

const ICONS = {
  success: '✅',
  error: '🪨',
  warning: '⚠️',
  info: '🦴'
}

export default function Toast() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" role="region" aria-label="Notificaciones" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="alert"
        >
          <span className="toast__icon" aria-hidden="true">{ICONS[toast.type] || ICONS.info}</span>
          <p className="toast__message">{toast.message}</p>
          <button
            type="button"
            className="toast__close"
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
