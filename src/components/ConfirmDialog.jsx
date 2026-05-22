import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * ConfirmDialog — accessible modal for any confirmation action.
 * Props:
 *  isOpen, title, message, onConfirm, onCancel
 *  confirmLabel, cancelLabel, variant ('danger'|'warning'|'default')
 *  isLoading
 *  reservasCards — array of reserva objects → renders as styled cards
 *  details       — array of plain strings (simple fallback list)
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  details,
  reservasCards,
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

    const sel = 'a[href],button:not(:disabled),textarea,input,select,[tabindex]:not([tabindex="-1"])'
    const handleKey = (e) => {
      if (e.key === 'Escape' && !isLoading) { onCancel(); return }
      if (e.key !== 'Tab') return
      const nodes = [...(dialogRef.current?.querySelectorAll(sel) || [])]
      const first = nodes[0]; const last = nodes[nodes.length - 1]
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault()
        ;(e.shiftKey ? last : first)?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  const btnClass = variant === 'danger'
    ? 'button button--danger'
    : variant === 'warning'
    ? 'button button--warning'
    : 'button button--primary'

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onCancel()}>
      <section ref={dialogRef} className="confirm-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="cd-title" aria-describedby="cd-msg">

        <div className="confirm-dialog__header">
          <p className="eyebrow">Confirmar acción</p>
          <h2 id="cd-title">{title}</h2>
        </div>

        <p id="cd-msg" className="confirm-dialog__message">{message}</p>

        {/* Rich reservation cards for bloqueo */}
        {reservasCards && reservasCards.length > 0 && (
          <div className="confirm-dialog__reservas">
            {reservasCards.map((r) => (
              <div key={r.id} className="confirm-reserva-card">
                <div className="confirm-reserva-card__row">
                  <span className="confirm-reserva-card__label">Cliente</span>
                  <strong>{r.cliente_nombre}</strong>
                </div>
                <div className="confirm-reserva-card__row">
                  <span className="confirm-reserva-card__label"> Teléfono</span>
                  <a href={`tel:${r.cliente_tel}`} className="contact-link">{r.cliente_tel}</a>
                </div>
                <div className="confirm-reserva-card__row">
                  <span className="confirm-reserva-card__label"> Correo</span>
                  <a href={`mailto:${r.cliente_email}`} className="contact-link">{r.cliente_email}</a>
                </div>
                <div className="confirm-reserva-card__row">
                  <span className="confirm-reserva-card__label"> Fecha · Hora</span>
                  <strong>{r.fecha} · {r.hora?.slice(0, 5)}</strong>
                </div>
                <div className="confirm-reserva-card__row">
                  <span className="confirm-reserva-card__label"> Personas</span>
                  <strong>{r.num_personas}</strong>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plain text details fallback */}
        {!reservasCards && details && details.length > 0 && (
          <div className="confirm-dialog__details">
            {details.map((item, i) => (
              <div key={i} className="confirm-dialog__detail-item">{item}</div>
            ))}
          </div>
        )}

        <div className="confirm-dialog__actions">
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button ref={confirmBtnRef} type="button" className={btnClass} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  )
}
