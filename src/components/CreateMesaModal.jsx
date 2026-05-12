import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createMesa } from '../services/mesasService'

const initialForm = {
  numero: '',
  capacidad: '2',
  ubicacion: 'Zona interior',
  estado: 'disponible'
}

function CreateMesaModal({ mesas, onClose, onMesaCreada }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [saving, onClose])

  const handleChange = (event) => {
    const { name, value } = event.target

    const cleanValue = name === 'numero' || name === 'capacidad'
      ? value.replace(/\D/g, '')
      : value

    setForm((currentForm) => ({
      ...currentForm,
      [name]: cleanValue
    }))

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
      general: ''
    }))
  }

  const validarFormulario = () => {
    const nextErrors = {}
    const numero = Number(form.numero)
    const capacidad = Number(form.capacidad)

    if (!numero || numero < 1) {
      nextErrors.numero = 'Ingresa un número de mesa válido.'
    }

    if (!capacidad || capacidad < 1) {
      nextErrors.capacidad = 'Selecciona una capacidad válida.'
    }

    const existeMesa = mesas.some((mesa) => Number(mesa.numero) === numero)

    if (existeMesa) {
      nextErrors.numero = `Ya existe una mesa con el número ${numero}.`
    }

    if (!form.ubicacion.trim()) {
      nextErrors.ubicacion = 'Selecciona una ubicación.'
    }

    if (!form.estado) {
      nextErrors.estado = 'Selecciona un estado inicial.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validarFormulario()) return

    setSaving(true)
    setErrors({})

    const nuevaMesa = {
      numero: Number(form.numero),
      capacidad: Number(form.capacidad),
      ubicacion: form.ubicacion.trim(),
      estado: form.estado
    }

    const { error } = await createMesa(nuevaMesa)

    if (error) {
      console.error(error)
      setErrors({
        general: 'No se pudo crear la mesa. Revisa las políticas RLS de Supabase.'
      })
      setSaving(false)
      return
    }

    setSaving(false)
    onMesaCreada()
  }

  return createPortal(
    <div className="modal-overlay">
      <section
        className="create-table-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-table-title"
      >
        <div className="create-table-modal__header">
          <p className="eyebrow">Administración del salón</p>
          <h2 id="create-table-title">Crear nueva mesa</h2>
          <p>
            Registra una mesa nueva indicando su número, capacidad, ubicación y estado inicial.
          </p>
        </div>

        {errors.general && <p className="alert alert--error">{errors.general}</p>}

        <form className="create-table-form" onSubmit={handleSubmit} noValidate>
          <label>
            Número de mesa
            <input
              name="numero"
              value={form.numero}
              onChange={handleChange}
              placeholder="Ej: 9"
              inputMode="numeric"
              maxLength="3"
              aria-invalid={Boolean(errors.numero)}
            />
            {errors.numero && <small>{errors.numero}</small>}
          </label>

          <label>
            Capacidad
            <select
              name="capacidad"
              value={form.capacidad}
              onChange={handleChange}
              aria-invalid={Boolean(errors.capacidad)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((capacidad) => (
                <option key={capacidad} value={capacidad}>
                  {capacidad} {capacidad === 1 ? 'persona' : 'personas'}
                </option>
              ))}
            </select>
            {errors.capacidad && <small>{errors.capacidad}</small>}
          </label>

          <label>
            Ubicación
            <select
                name="ubicacion"
                value={form.ubicacion}
                onChange={handleChange}
                aria-invalid={Boolean(errors.ubicacion)}
            >
                <option value="Zona interior">Zona interior</option>
                <option value="Zona terraza">Zona terraza</option>
                <option value="Zona ventana">Zona ventana</option>
            </select>
            {errors.ubicacion && <small>{errors.ubicacion}</small>}
          </label>

          <label>
            Estado inicial
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              aria-invalid={Boolean(errors.estado)}
            >
              <option value="disponible">Disponible</option>
              <option value="ocupada">Ocupada</option>
            </select>
            {errors.estado && <small>{errors.estado}</small>}
          </label>

          <div className="create-table-modal__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="button button--primary"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Crear mesa'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  )
}

export default CreateMesaModal