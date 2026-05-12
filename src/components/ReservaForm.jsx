import { useMemo, useRef, useState } from 'react'
import { updateMesa } from '../services/mesasService'
import { createReserva } from '../services/reservasService'
import ConfirmationModal from './ConfirmationModal'

const getToday = () => new Date().toISOString().split('T')[0]

function ReservaForm({ mesa, onCancel, onReservaCreada }) {
  const capacidadMesa = Number(mesa?.capacidad) || 1

  const fechaInputRef = useRef(null)
  const horaInputRef = useRef(null)

  const [form, setForm] = useState({
    cliente_nombre: '',
    cliente_tel: '',
    cliente_email: '',
    fecha: getToday(),
    hora: '',
    num_personas: String(capacidadMesa)
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  const opcionesPersonas = Array.from({ length: capacidadMesa }, (_, index) => index + 1)
  const personas = Number(form.num_personas)

  const abrirSelectorNativo = (inputRef) => {
    const input = inputRef.current

    if (!input) return

    input.focus()

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
      } catch {
        input.focus()
      }
    }
  }

  const resumenReserva = useMemo(() => ({
    mesa: mesa.numero,
    capacidad: capacidadMesa,
    cliente: form.cliente_nombre || 'Sin nombre',
    telefono: form.cliente_tel || 'Sin teléfono',
    email: form.cliente_email || 'No registrado',
    fecha: form.fecha || 'Sin fecha',
    hora: form.hora || 'Sin hora',
    personas: form.num_personas || '0'
  }), [capacidadMesa, form, mesa.numero])

  const handleChange = (event) => {
    const { name, value } = event.target
    const cleanValue = name === 'cliente_tel' ? value.replace(/\D/g, '') : value

    setForm((currentForm) => ({
      ...currentForm,
      [name]: cleanValue
    }))

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
      general: ''
    }))

    setMostrarConfirmacion(false)
  }

  const validarFormulario = () => {
    const nextErrors = {}
    const hoy = getToday()
    const nombre = form.cliente_nombre.trim()
    const telefono = form.cliente_tel.trim()
    const correo = form.cliente_email.trim()

    if (!nombre) {
      nextErrors.cliente_nombre = 'Ingresa el nombre del cliente.'
    } else if (nombre.length < 3) {
      nextErrors.cliente_nombre = 'El nombre debe tener al menos 3 caracteres.'
    }

    if (!telefono) {
      nextErrors.cliente_tel = 'Ingresa un número de contacto.'
    } else if (!/^\d+$/.test(telefono)) {
      nextErrors.cliente_tel = 'El teléfono solo puede contener números.'
    } else if (telefono.length < 7 || telefono.length > 15) {
      nextErrors.cliente_tel = 'El teléfono debe tener entre 7 y 15 dígitos.'
    }

    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      nextErrors.cliente_email = 'Ingresa un correo válido o deja el campo vacío.'
    }

    if (!form.fecha) {
      nextErrors.fecha = 'Selecciona una fecha.'
    } else if (form.fecha < hoy) {
      nextErrors.fecha = 'La fecha no puede ser anterior a hoy.'
    }

    if (!form.hora) {
      nextErrors.hora = 'Selecciona una hora.'
    }

    if (!personas || personas < 1) {
      nextErrors.num_personas = 'Selecciona la cantidad de personas.'
    } else if (personas > capacidadMesa) {
      nextErrors.num_personas = `Esta mesa admite máximo ${capacidadMesa} personas.`
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handlePreConfirmar = (event) => {
    event.preventDefault()

    if (!validarFormulario()) return

    setMostrarConfirmacion(true)
  }

  const handleConfirmarReserva = async () => {
    setIsSubmitting(true)
    setErrors({})

    const reserva = {
      mesa_id: mesa.id,
      cliente_nombre: form.cliente_nombre.trim(),
      cliente_tel: form.cliente_tel.trim(),
      cliente_email: form.cliente_email.trim() || null,
      fecha: form.fecha,
      hora: form.hora,
      num_personas: personas,
      estado: 'activa'
    }

    const { error: reservaError } = await createReserva(reserva)

    if (reservaError) {
      console.error(reservaError)
      setErrors({ general: 'No se pudo crear la reserva. Revisa Supabase e intenta nuevamente.' })
      setIsSubmitting(false)
      setMostrarConfirmacion(false)
      return
    }

    const { error: mesaError } = await updateMesa(mesa.id, { estado: 'ocupada' })

    if (mesaError) {
      console.error(mesaError)
      setErrors({ general: 'La reserva se creó, pero no se pudo actualizar el estado de la mesa.' })
      setIsSubmitting(false)
      setMostrarConfirmacion(false)
      return
    }

    setIsSubmitting(false)
    setMostrarConfirmacion(false)
    onReservaCreada()
  }

  return (
    <section className="reservation-form-card">
      <div className="selected-table-card">
        <p className="eyebrow">Mesa seleccionada</p>
        <h2>Mesa {mesa.numero}</h2>
        <p>{capacidadMesa} personas · {mesa.ubicacion || 'Salón principal'}</p>
      </div>

      {errors.general && <p className="alert alert--error">{errors.general}</p>}

      <form className="reservation-form" onSubmit={handlePreConfirmar} noValidate>
        <label>
          Nombre del cliente
          <input
            name="cliente_nombre"
            value={form.cliente_nombre}
            onChange={handleChange}
            placeholder="Ej: Laura Gómez"
            autoComplete="name"
            aria-invalid={Boolean(errors.cliente_nombre)}
          />
          {errors.cliente_nombre && <small>{errors.cliente_nombre}</small>}
        </label>

        <label>
          Teléfono
          <input
            name="cliente_tel"
            value={form.cliente_tel}
            onChange={handleChange}
            placeholder="Ej: 3001234567"
            autoComplete="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="15"
            aria-invalid={Boolean(errors.cliente_tel)}
          />
          {errors.cliente_tel && <small>{errors.cliente_tel}</small>}
        </label>

        <label>
          Correo electrónico opcional
          <input
            type="email"
            name="cliente_email"
            value={form.cliente_email}
            onChange={handleChange}
            placeholder="cliente@email.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.cliente_email)}
          />
          {errors.cliente_email && <small>{errors.cliente_email}</small>}
        </label>

        <div className="form-row">
          <label>
            Fecha
            <input
              ref={fechaInputRef}
              type="date"
              name="fecha"
              value={form.fecha}
              min={getToday()}
              onClick={() => abrirSelectorNativo(fechaInputRef)}
              onChange={handleChange}
              aria-invalid={Boolean(errors.fecha)}
            />
            {errors.fecha && <small>{errors.fecha}</small>}
          </label>

          <label>
            Hora
            <input
              ref={horaInputRef}
              type="time"
              name="hora"
              value={form.hora}
              onClick={() => abrirSelectorNativo(horaInputRef)}
              onChange={handleChange}
              aria-invalid={Boolean(errors.hora)}
            />
            {errors.hora && <small>{errors.hora}</small>}
          </label>
        </div>

        <label>
          Número de personas
          <select
            name="num_personas"
            value={form.num_personas}
            onChange={handleChange}
            aria-invalid={Boolean(errors.num_personas)}
          >
            {opcionesPersonas.map((cantidad) => (
              <option key={cantidad} value={cantidad}>
                {cantidad} {cantidad === 1 ? 'persona' : 'personas'}
              </option>
            ))}
          </select>
          {errors.num_personas && <small>{errors.num_personas}</small>}
        </label>

        <div className="form-actions">
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>

          <button type="submit" className="button button--primary">
            Revisar reserva
          </button>
        </div>
      </form>

      {mostrarConfirmacion && (
        <ConfirmationModal
          reserva={resumenReserva}
          isSubmitting={isSubmitting}
          onClose={() => setMostrarConfirmacion(false)}
          onConfirm={handleConfirmarReserva}
        />
      )}
    </section>
  )
}

export default ReservaForm