import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  details,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false
}) {
  const dialogRef = useRef(null)
  const confirmBtnRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const prev = document.activeElement
    document.body.style.overflow = 'hidden'
    confirmBtnRef.current?.focus()

    const focusableSelectors = 'a[href],button:not(:disabled),textarea,input,select,[tabindex]:not([tabindex="-1"])'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) { onCancel(); return }
      if (e.key !== 'Tab') return
      const nodes = [...(dialogRef.current?.querySelectorAll(focusableSelectors) || [])]
      const first = nodes[0]; const last = nodes[nodes.length - 1]
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault()
        ;(e.shiftKey ? last : first)?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onCancel()}>
      <section
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="confirm-dialog__header">
          <p className="eyebrow">Confirmar acción</p>
          <h2 id="confirm-dialog-title">{title}</h2>
        </div>

        <p id="confirm-dialog-message" className="confirm-dialog__message">{message}</p>

        {details && details.length > 0 && (
          <div className="confirm-dialog__details">
            {details.map((item, i) => (
              <div key={i} className="confirm-dialog__detail-item">{item}</div>
            ))}
          </div>
        )}

        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`button ${variant === 'danger' ? 'button--danger' : variant === 'warning' ? 'button--warning' : 'button--primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  )
}
