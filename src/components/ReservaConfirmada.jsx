import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Check, Clock, Mail, Pencil, Phone, Save, UtensilsCrossed, Users, X } from 'lucide-react'
import { updateReserva } from '../services/reservasService'
import { useToast } from '../context/ToastContext'

export default function ReservaConfirmada({ reserva, onVolver }) {
  const { addToast } = useToast()
  const dialogRef = useRef(null)
  const closeBtnRef = useRef(null)

  const [modoEdicion, setModoEdicion] = useState(false)
  const [form, setForm] = useState({
    cliente_nombre: reserva.cliente_nombre || '',
    cliente_tel: reserva.cliente_tel || '',
    cliente_email: reserva.cliente_email || ''
  })
  const [guardando, setGuardando] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const prev = document.activeElement
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    const focusable = 'button:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex="-1"])'
    const handleKey = (e) => {
      if (e.key === 'Escape' && !guardando) { onVolver(); return }
      if (e.key !== 'Tab') return
      const nodes = [...(dialogRef.current?.querySelectorAll(focusable) || [])]
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
  }, [guardando, onVolver])

  const handleChange = (e) => {
    const { name, value } = e.target
    const clean = name === 'cliente_tel' ? value.replace(/\D/g, '') : value
    setForm(prev => ({ ...prev, [name]: clean }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validarEdicion = () => {
    const next = {}
    if (!form.cliente_nombre.trim()) next.cliente_nombre = 'Requerido.'
    if (!form.cliente_tel.trim()) next.cliente_tel = 'Requerido.'
    else if (form.cliente_tel.length < 7) next.cliente_tel = 'Mínimo 7 dígitos.'
    if (!form.cliente_email.trim()) next.cliente_email = 'Requerido.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.cliente_email)) next.cliente_email = 'Correo inválido.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleGuardar = async () => {
    if (!validarEdicion()) return
    if (!reserva.id) { addToast('No se puede actualizar: ID de reserva no disponible.', 'error'); return }
    setGuardando(true)
    const { error } = await updateReserva(reserva.id, {
      cliente_nombre: form.cliente_nombre.trim(),
      cliente_tel: form.cliente_tel.trim(),
      cliente_email: form.cliente_email.trim()
    })
    if (error) {
      addToast('No se pudo guardar los cambios.', 'error')
    } else {
      addToast('Datos de contacto actualizados correctamente.', 'success')
      setModoEdicion(false)
    }
    setGuardando(false)
  }

  const datosActuales = {
    cliente_nombre: form.cliente_nombre || reserva.cliente_nombre,
    cliente_tel: form.cliente_tel || reserva.cliente_tel,
    cliente_email: form.cliente_email || reserva.cliente_email
  }

  return createPortal(
    <div className="modal-overlay">
      <section
        ref={dialogRef}
        className="reserva-modal-confirmada"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rmc-title"
      >
        {/* Header de éxito */}
        <div className="rmc-header">
          <div className="rmc-check-icon" aria-hidden="true">
            <Check size={36} strokeWidth={3} />
          </div>
          <p className="eyebrow">¡Reserva exitosa!</p>
          <h2 id="rmc-title">Su reserva ha sido confirmada</h2>
          <p className="rmc-subtitle">Te esperamos en el restaurante.</p>
        </div>

        {/* Resumen de la reserva (datos de mesa/fecha/hora — no editables) */}
        <div className="rmc-summary-stone">
          <div className="rmc-summary-grid">
            <div className="rmc-summary-item">
              <UtensilsCrossed size={16} aria-hidden="true" />
              <span>Mesa {reserva.mesa_numero}</span>
            </div>
            <div className="rmc-summary-item">
              <Calendar size={16} aria-hidden="true" />
              <span>{reserva.fecha}</span>
            </div>
            <div className="rmc-summary-item">
              <Clock size={16} aria-hidden="true" />
              <span>{reserva.hora}</span>
            </div>
            <div className="rmc-summary-item">
              <Users size={16} aria-hidden="true" />
              <span>{reserva.num_personas} {reserva.num_personas === 1 ? 'persona' : 'personas'}</span>
            </div>
          </div>
        </div>

        {/* Datos del cliente — editables */}
        <div className="rmc-client-section">
          <div className="rmc-client-header">
            <h3>Datos de contacto</h3>
            {!modoEdicion && (
              <button type="button" className="mini-button mini-button--state rmc-edit-btn"
                onClick={() => setModoEdicion(true)}>
                <Pencil size={13} aria-hidden="true" /> Corregir datos
              </button>
            )}
          </div>

          {!modoEdicion ? (
            <ul className="rmc-client-list">
              <li><Phone size={14} aria-hidden="true" /><span>{datosActuales.cliente_nombre}</span></li>
              <li><Phone size={14} aria-hidden="true" /><a href={`tel:${datosActuales.cliente_tel}`}>{datosActuales.cliente_tel}</a></li>
              <li><Mail size={14} aria-hidden="true" /><a href={`mailto:${datosActuales.cliente_email}`}>{datosActuales.cliente_email}</a></li>
            </ul>
          ) : (
            <div className="rmc-edit-form">
              <label htmlFor="rmc-nombre">
                Nombre
                <input id="rmc-nombre" name="cliente_nombre" value={form.cliente_nombre} onChange={handleChange}
                  aria-invalid={Boolean(errors.cliente_nombre)} />
                {errors.cliente_nombre && <small role="alert">{errors.cliente_nombre}</small>}
              </label>
              <label htmlFor="rmc-tel">
                Teléfono
                <input id="rmc-tel" name="cliente_tel" value={form.cliente_tel} onChange={handleChange}
                  inputMode="numeric" maxLength="15"
                  aria-invalid={Boolean(errors.cliente_tel)} />
                {errors.cliente_tel && <small role="alert">{errors.cliente_tel}</small>}
              </label>
              <label htmlFor="rmc-email">
                Correo
                <input id="rmc-email" type="email" name="cliente_email" value={form.cliente_email} onChange={handleChange}
                  aria-invalid={Boolean(errors.cliente_email)} />
                {errors.cliente_email && <small role="alert">{errors.cliente_email}</small>}
              </label>
              <div className="rmc-edit-actions">
                <button type="button" className="button button--ghost" onClick={() => { setModoEdicion(false); setErrors({}) }} disabled={guardando}>
                  Cancelar
                </button>
                <button type="button" className="button button--primary" onClick={handleGuardar} disabled={guardando}>
                  <Save size={14} aria-hidden="true" /> {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nota sobre cancelaciones */}
        <div className="rmc-notice">
          <p>
            <strong>¿Necesitas cancelar o cambiar la reserva?</strong><br />
            Solo el restaurante puede modificar o cancelar reservas. Comunícate con nosotros con anticipación.
          </p>
        </div>

        {/* Botón cerrar */}
        <button
          ref={closeBtnRef}
          type="button"
          className="button button--primary rmc-close-btn"
          onClick={onVolver}
          disabled={guardando}
        >
          Volver al salón
        </button>
      </section>
    </div>,
    document.body
  )
}
