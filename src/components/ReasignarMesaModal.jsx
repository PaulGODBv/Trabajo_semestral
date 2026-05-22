import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import SalonMap from './SalonMap'
import { getMesas, updateMesa } from '../services/mesasService'
import { reactivarReserva } from '../services/reservasService'
import { useToast } from '../context/ToastContext'

export default function ReasignarMesaModal({ reserva, onClose, onReactivada }) {
  const { addToast } = useToast()
  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const dialogRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    getMesas().then(({ data }) => {
      setMesas(data || [])
      setLoading(false)
    })
    const handleKey = (e) => { if (e.key === 'Escape' && !guardando) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [guardando, onClose])

  const handleConfirmar = async () => {
    if (!mesaSeleccionada) return
    setGuardando(true)
    const { error: reError } = await reactivarReserva(reserva.id, mesaSeleccionada.id)
    if (reError) {
      addToast('No se pudo reactivar la reserva.', 'error')
      setGuardando(false)
      return
    }
    const { error: mesaError } = await updateMesa(mesaSeleccionada.id, { estado: 'ocupada' })
    if (mesaError) {
      addToast('Reserva reactivada, pero no se pudo marcar la mesa como ocupada.', 'warning')
    } else {
      addToast(`Reserva de ${reserva.cliente_nombre} reactivada en Mesa ${mesaSeleccionada.numero}.`, 'success')
    }
    setGuardando(false)
    onReactivada()
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !guardando && onClose()}>
      <section
        ref={dialogRef}
        className="reasignar-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rm-title"
      >
        <div className="reasignar-modal__header">
          <div>
            <p className="eyebrow">Reasignar reserva</p>
            <h2 id="rm-title">Selecciona una mesa disponible</h2>
            <p>
              La mesa original ya está ocupada. Elige una mesa disponible (verde) para reactivar
              la reserva de <strong>{reserva.cliente_nombre}</strong> del {reserva.fecha} a las {reserva.hora?.slice(0,5)}.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {mesaSeleccionada && (
          <div className="reasignar-modal__selected alert alert--success" role="status">
            <strong>Mesa {mesaSeleccionada.numero} seleccionada</strong> — {mesaSeleccionada.capacidad} personas · {mesaSeleccionada.ubicacion}
          </div>
        )}

        <div className="reasignar-modal__map">
          <SalonMap
            mesas={mesas}
            loading={loading}
            mesaSeleccionada={mesaSeleccionada}
            onSelectMesa={setMesaSeleccionada}
          />
        </div>

        <div className="reasignar-modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={handleConfirmar}
            disabled={!mesaSeleccionada || guardando}
          >
            {guardando ? 'Guardando...' : `Confirmar en Mesa ${mesaSeleccionada?.numero ?? '–'}`}
          </button>
        </div>
      </section>
    </div>,
    document.body
  )
}
