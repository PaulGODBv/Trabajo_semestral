import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { updateMesa } from '../services/mesasService'

export default function EditMesaModal({ mesa, onClose, onMesaEditada }) {
  const [form, setForm] = useState({
    capacidad: String(mesa.capacidad),
    ubicacion: mesa.ubicacion || 'Zona interior'
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)
  const firstRef = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    document.body.style.overflow = 'hidden'
    firstRef.current?.focus()

    const focusable = 'button:not(:disabled),input,select,[tabindex]:not([tabindex="-1"])'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) { onClose(); return }
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
  }, [saving, onClose])

  const handleChange = (e) => {
    const { name, value } = e.target
    const clean = name === 'capacidad' ? value.replace(/\D/g, '') : value
    setForm((prev) => ({ ...prev, [name]: clean }))
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }))
  }

  const validar = () => {
    const next = {}
    const cap = Number(form.capacidad)
    if (!cap || cap < 1 || cap > 20) next.capacidad = 'La capacidad debe ser entre 1 y 20 personas.'
    if (!form.ubicacion.trim()) next.ubicacion = 'Selecciona una ubicación.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validar()) return

    setSaving(true)
    const { error } = await updateMesa(mesa.id, {
      capacidad: Number(form.capacidad),
      ubicacion: form.ubicacion.trim()
    })

    if (error) {
      setErrors({ general: 'No se pudo guardar la mesa. Intenta nuevamente.' })
      setSaving(false)
      return
    }

    setSaving(false)
    onMesaEditada()
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <section
        ref={dialogRef}
        className="create-table-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-mesa-title"
      >
        <div className="create-table-modal__header">
          <p className="eyebrow">Editar mesa</p>
          <h2 id="edit-mesa-title">Mesa {mesa.numero}</h2>
          <p>El número de mesa no se puede modificar una vez creada.</p>
        </div>

        {errors.general && <p className="alert alert--error" role="alert">{errors.general}</p>}

        <form className="create-table-form" onSubmit={handleSubmit} noValidate>
          <label>
            Número de mesa <span className="field-hint">(no editable)</span>
            <input value={mesa.numero} disabled aria-readonly="true" />
          </label>

          <label htmlFor="em-cap">
            Capacidad
            <select
              id="em-cap"
              ref={firstRef}
              name="capacidad"
              value={form.capacidad}
              onChange={handleChange}
              aria-invalid={Boolean(errors.capacidad)}
              aria-describedby={errors.capacidad ? 'em-cap-error' : undefined}
            >
              {[1,2,3,4,5,6,7,8,9,10,12].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
              ))}
            </select>
            {errors.capacidad && <small id="em-cap-error" role="alert">{errors.capacidad}</small>}
          </label>

          <label htmlFor="em-ub">
            Ubicación
            <select
              id="em-ub"
              name="ubicacion"
              value={form.ubicacion}
              onChange={handleChange}
              aria-invalid={Boolean(errors.ubicacion)}
            >
              <option value="Zona interior">Zona interior</option>
              <option value="Zona terraza">Zona terraza</option>
              <option value="Zona ventana">Zona ventana</option>
            </select>
            {errors.ubicacion && <small role="alert">{errors.ubicacion}</small>}
          </label>

          <div className="create-table-modal__actions">
            <button type="button" className="button button--ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  )
}
