import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function ConfirmationModal({ reserva, isSubmitting, onClose, onConfirm }) {
  const dialogRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    document.body.style.overflow = 'hidden'
    confirmRef.current?.focus()

    const focusable = 'button:not(:disabled),[tabindex]:not([tabindex="-1"])'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) { onClose(); return }
      if (e.key !== 'Tab') return
      const nodes = [...(dialogRef.current?.querySelectorAll(focusable) || [])]
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
  }, [isSubmitting, onClose])

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}>
      <section
        ref={dialogRef}
        className="reservation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rm-title"
        aria-describedby="rm-desc"
      >
        <div className="reservation-modal__header">
          <p className="eyebrow"> Última revisión</p>
          <h2 id="rm-title"> Revisa antes de confirmar</h2>
          <p id="rm-desc">Verifica que los datos estén correctos antes de guardar la reserva.</p>
        </div>

        <div className="reservation-modal__stone">
          <ul className="reservation-modal__list">
            {[
              ['Mesa', reserva.mesa],
              ['Cliente', reserva.cliente],
              ['Contacto', reserva.telefono],
              ['Correo', reserva.email],
              ['Fecha y hora', `${reserva.fecha} · ${reserva.hora}`],
              ['Personas', `${reserva.personas} de ${reserva.capacidad}`]
            ].map(([label, value]) => (
              <li key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="reservation-modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={isSubmitting}>
            Volver a editar
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="button button--primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : ' Confirmar reserva'}
          </button>
        </div>
      </section>
    </div>,
    document.body
  )
}
