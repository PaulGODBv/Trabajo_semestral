import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { updateMesa } from '../services/mesasService'
import { createReserva, verificarDisponibilidad } from '../services/reservasService'
import { getHorarioActivoPorDia } from '../services/horariosService'
import { getDiaSemana, generarSlots, normalizarHora } from '../utils/horarios'
import ConfirmationModal from './ConfirmationModal'

const getToday = () => new Date().toISOString().split('T')[0]

function ReservaForm({ mesa, onCancel, onReservaCreada }) {
  const capacidadMesa = Number(mesa?.capacidad) || 1
  const fechaInputRef = useRef(null)

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
  const [slotsHora, setSlotsHora] = useState([])
  const [cargandoHorarios, setCargandoHorarios] = useState(false)
  const [sinHorarios, setSinHorarios] = useState(false)

  const cargarSlotsParaFecha = useCallback(async (fecha) => {
    if (!fecha) return
    setCargandoHorarios(true)
    setSinHorarios(false)
    setSlotsHora([])

    const dia = getDiaSemana(fecha)
    const { data, error } = await getHorarioActivoPorDia(dia)

    if (error || !data || data.length === 0) {
      setSinHorarios(true)
      setCargandoHorarios(false)
      return
    }

    const horario = data[0]
    const slots = generarSlots(
      normalizarHora(horario.hora_inicio),
      normalizarHora(horario.hora_fin)
    )
    setSlotsHora(slots)
    setSinHorarios(slots.length === 0)
    setCargandoHorarios(false)
  }, [])

  useEffect(() => {
    cargarSlotsParaFecha(form.fecha)
  }, [form.fecha, cargarSlotsParaFecha])

  const opcionesPersonas = Array.from({ length: capacidadMesa }, (_, i) => i + 1)
  const personas = Number(form.num_personas)

  const abrirSelectorFecha = () => {
    const input = fechaInputRef.current
    if (!input) return
    input.focus()
    if (typeof input.showPicker === 'function') {
      try { input.showPicker() } catch { input.focus() }
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

  const handleChange = (e) => {
    const { name, value } = e.target
    const cleanValue = name === 'cliente_tel' ? value.replace(/\D/g, '') : value
    setForm((prev) => ({ ...prev, [name]: cleanValue }))
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }))
    setMostrarConfirmacion(false)
    if (name === 'fecha') setForm((prev) => ({ ...prev, hora: '', fecha: cleanValue }))
  }

  const validarFormulario = () => {
    const next = {}
    const hoy = getToday()
    const nombre = form.cliente_nombre.trim()
    const telefono = form.cliente_tel.trim()
    const correo = form.cliente_email.trim()

    if (!nombre) next.cliente_nombre = 'Ingresa el nombre del cliente.'
    else if (nombre.length < 3) next.cliente_nombre = 'El nombre debe tener al menos 3 caracteres.'

    if (!telefono) next.cliente_tel = 'Ingresa un número de contacto.'
    else if (!/^\d+$/.test(telefono)) next.cliente_tel = 'El teléfono solo puede contener números.'
    else if (telefono.length < 7 || telefono.length > 15) next.cliente_tel = 'El teléfono debe tener entre 7 y 15 dígitos.'

    // RF-05: email obligatorio
    if (!correo) next.cliente_email = 'El correo electrónico es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) next.cliente_email = 'Ingresa un correo electrónico válido.'

    if (!form.fecha) next.fecha = 'Selecciona una fecha.'
    else if (form.fecha < hoy) next.fecha = 'La fecha no puede ser anterior a hoy.'

    if (!form.hora) next.hora = sinHorarios ? 'No hay horarios disponibles para este día.' : 'Selecciona una hora.'

    if (!personas || personas < 1) next.num_personas = 'Selecciona la cantidad de personas.'
    else if (personas > capacidadMesa) next.num_personas = `Esta mesa admite máximo ${capacidadMesa} personas.`

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handlePreConfirmar = (e) => {
    e.preventDefault()
    if (!validarFormulario()) return
    setMostrarConfirmacion(true)
  }

  const handleConfirmarReserva = async () => {
    setIsSubmitting(true)
    setErrors({})

    // RF-07: verificar disponibilidad justo antes de insertar
    const { disponible, error: checkError } = await verificarDisponibilidad(mesa.id, form.fecha, form.hora)
    if (checkError || !disponible) {
      setErrors({ general: 'Esta mesa ya fue reservada para ese horario por otro usuario. Por favor elige otro horario o una mesa diferente.' })
      setIsSubmitting(false)
      setMostrarConfirmacion(false)
      return
    }

    const reserva = {
      mesa_id: mesa.id,
      cliente_nombre: form.cliente_nombre.trim(),
      cliente_tel: form.cliente_tel.trim(),
      cliente_email: form.cliente_email.trim(),
      fecha: form.fecha,
      hora: form.hora,
      num_personas: personas,
      estado: 'activa'
    }

    const { error: reservaError } = await createReserva(reserva)
    if (reservaError) {
      // Detectar error de unicidad (si hay constraint en DB)
      const esConflicto = reservaError.code === '23505' || reservaError.message?.includes('unique')
      setErrors({ general: esConflicto
        ? 'Esta mesa fue tomada en el último momento por otro usuario. Elige otro horario o mesa.'
        : 'No se pudo crear la reserva. Intenta nuevamente.'
      })
      setIsSubmitting(false)
      setMostrarConfirmacion(false)
      return
    }

    const { error: mesaError } = await updateMesa(mesa.id, { estado: 'ocupada' })
    if (mesaError) {
      setErrors({ general: 'La reserva se creó, pero no se pudo actualizar el estado de la mesa.' })
      setIsSubmitting(false)
      setMostrarConfirmacion(false)
      return
    }

    setIsSubmitting(false)
    setMostrarConfirmacion(false)
    onReservaCreada({ ...reserva, mesa_numero: mesa.numero })
  }

  return (
    <section className="reservation-form-card" aria-label={`Formulario de reserva para Mesa ${mesa.numero}`}>
      <div className="selected-table-card">
        <p className="eyebrow">Mesa seleccionada</p>
        <h2>Mesa {mesa.numero}</h2>
        <p>{capacidadMesa} {capacidadMesa === 1 ? 'persona' : 'personas'} · {mesa.ubicacion || 'Salón principal'}</p>
      </div>

      {errors.general && (
        <p className="alert alert--error" role="alert">{errors.general}</p>
      )}

      <form className="reservation-form" onSubmit={handlePreConfirmar} noValidate>
        <label htmlFor="rf-nombre">
          Nombre del cliente
          <input
            id="rf-nombre"
            name="cliente_nombre"
            value={form.cliente_nombre}
            onChange={handleChange}
            placeholder="Ej: Laura Gómez"
            autoComplete="name"
            aria-invalid={Boolean(errors.cliente_nombre)}
            aria-describedby={errors.cliente_nombre ? 'rf-nombre-error' : undefined}
          />
          {errors.cliente_nombre && <small id="rf-nombre-error" role="alert">{errors.cliente_nombre}</small>}
        </label>

        <label htmlFor="rf-tel">
          Teléfono
          <input
            id="rf-tel"
            name="cliente_tel"
            value={form.cliente_tel}
            onChange={handleChange}
            placeholder="Ej: 3001234567"
            autoComplete="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="15"
            aria-invalid={Boolean(errors.cliente_tel)}
            aria-describedby={errors.cliente_tel ? 'rf-tel-error' : undefined}
          />
          {errors.cliente_tel && <small id="rf-tel-error" role="alert">{errors.cliente_tel}</small>}
        </label>

        <label htmlFor="rf-email">
          Correo electrónico
          <input
            id="rf-email"
            type="email"
            name="cliente_email"
            value={form.cliente_email}
            onChange={handleChange}
            placeholder="cliente@email.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.cliente_email)}
            aria-describedby={errors.cliente_email ? 'rf-email-error' : undefined}
            aria-required="true"
          />
          {errors.cliente_email && <small id="rf-email-error" role="alert">{errors.cliente_email}</small>}
        </label>

        <label htmlFor="rf-fecha">
          Fecha de la reserva
          <input
            id="rf-fecha"
            ref={fechaInputRef}
            type="date"
            name="fecha"
            value={form.fecha}
            min={getToday()}
            onClick={abrirSelectorFecha}
            onChange={handleChange}
            aria-invalid={Boolean(errors.fecha)}
            aria-describedby={errors.fecha ? 'rf-fecha-error' : undefined}
          />
          {errors.fecha && <small id="rf-fecha-error" role="alert">{errors.fecha}</small>}
        </label>

        <label htmlFor="rf-hora">
          Hora de la reserva
          {cargandoHorarios && <span className="field-hint">Cargando horarios...</span>}
          {sinHorarios && !cargandoHorarios && (
            <span className="field-hint field-hint--warn">⚠️ No hay horarios disponibles para ese día.</span>
          )}
          <select
            id="rf-hora"
            name="hora"
            value={form.hora}
            onChange={handleChange}
            disabled={cargandoHorarios || sinHorarios || slotsHora.length === 0}
            aria-invalid={Boolean(errors.hora)}
            aria-describedby={errors.hora ? 'rf-hora-error' : undefined}
          >
            <option value="">-- Selecciona una hora --</option>
            {slotsHora.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
          {errors.hora && <small id="rf-hora-error" role="alert">{errors.hora}</small>}
        </label>

        <label htmlFor="rf-personas">
          Número de personas
          <select
            id="rf-personas"
            name="num_personas"
            value={form.num_personas}
            onChange={handleChange}
            aria-invalid={Boolean(errors.num_personas)}
            aria-describedby={errors.num_personas ? 'rf-personas-error' : undefined}
          >
            {opcionesPersonas.map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
            ))}
          </select>
          {errors.num_personas && <small id="rf-personas-error" role="alert">{errors.num_personas}</small>}
        </label>

        <div className="form-actions">
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={isSubmitting || sinHorarios}>
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
