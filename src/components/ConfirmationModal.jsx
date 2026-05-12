import { useEffect } from 'react'

function ConfirmationModal({
  reserva,
  isSubmitting,
  onClose,
  onConfirm
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSubmitting, onClose])

  return (
    <div className="modal-overlay" role="presentation">
      <section
        className="reservation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-modal-title"
      >
        <div className="reservation-modal__header">
          <p className="eyebrow">Última revisión</p>
          <h2 id="reservation-modal-title">Revisa antes de confirmar</h2>
          <p>
            Verifica que los datos estén correctos antes de guardar la reserva.
          </p>
        </div>

        <div className="reservation-modal__stone">
          <ul className="reservation-modal__list">
            <li>
              <span>Mesa</span>
              <strong>{reserva.mesa}</strong>
            </li>
            <li>
              <span>Cliente</span>
              <strong>{reserva.cliente}</strong>
            </li>
            <li>
              <span>Contacto</span>
              <strong>{reserva.telefono}</strong>
            </li>
            <li>
              <span>Correo</span>
              <strong>{reserva.email}</strong>
            </li>
            <li>
              <span>Fecha y hora</span>
              <strong>{reserva.fecha} · {reserva.hora}</strong>
            </li>
            <li>
              <span>Personas</span>
              <strong>{reserva.personas} de {reserva.capacidad}</strong>
            </li>
          </ul>
        </div>

        <div className="reservation-modal__actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Volver a editar
          </button>

          <button
            type="button"
            className="button button--primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar reserva'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmationModal