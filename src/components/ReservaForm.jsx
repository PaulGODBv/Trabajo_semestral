import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Clock, Mail, Phone, User, Users } from 'lucide-react'
import { updateMesa } from '../services/mesasService'
import { createReserva, verificarDisponibilidad } from '../services/reservasService'
import { getHorariosActivosPorDia } from '../services/horariosService'
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

  const cargarSlots = useCallback(async (fecha) => {
    if (!fecha) return
    setCargandoHorarios(true)
    setSinHorarios(false)
    setSlotsHora([])
    const dia = getDiaSemana(fecha)
    const { data, error } = await getHorariosActivosPorDia(dia)
    if (error || !data || data.length === 0) {
      setSinHorarios(true)
      setCargandoHorarios(false)
      return
    }
    const allSlots = data.flatMap(h => generarSlots(normalizarHora(h.hora_inicio), normalizarHora(h.hora_fin)))
    const unique = [...new Set(allSlots)].sort()
    setSlotsHora(unique)
    setSinHorarios(unique.length === 0)
    setCargandoHorarios(false)
  }, [])

  useEffect(() => { cargarSlots(form.fecha) }, [form.fecha, cargarSlots])

  const opcionesPersonas = Array.from({ length: capacidadMesa }, (_, i) => i + 1)
  const personas = Number(form.num_personas)

  const abrirFechaPicker = () => {
    const input = fechaInputRef.current
    if (!input) return
    input.focus()
    try { input.showPicker?.() } catch { /* noop */ }
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
    const clean = name === 'cliente_tel' ? value.replace(/\D/g, '') : value
    if (name === 'fecha') {
      setForm(prev => ({ ...prev, fecha: clean, hora: '' }))
    } else {
      setForm(prev => ({ ...prev, [name]: clean }))
    }
    setErrors(prev => ({ ...prev, [name]: '', general: '' }))
    setMostrarConfirmacion(false)
  }

  const validar = () => {
    const next = {}
    const hoy = getToday()
    const nombre = form.cliente_nombre.trim()
    const tel = form.cliente_tel.trim()
    const email = form.cliente_email.trim()

    if (!nombre) next.cliente_nombre = 'Ingresa el nombre del cliente.'
    else if (nombre.length < 3) next.cliente_nombre = 'El nombre debe tener al menos 3 caracteres.'

    if (!tel) next.cliente_tel = 'Ingresa un número de contacto.'
    else if (!/^\d+$/.test(tel)) next.cliente_tel = 'Solo números.'
    else if (tel.length < 7 || tel.length > 15) next.cliente_tel = 'Entre 7 y 15 dígitos.'

    if (!email) next.cliente_email = 'El correo electrónico es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.cliente_email = 'Correo inválido.'

    if (!form.fecha) next.fecha = 'Selecciona una fecha.'
    else if (form.fecha < hoy) next.fecha = 'La fecha no puede ser anterior a hoy.'

    if (!form.hora) next.hora = sinHorarios ? 'El restaurante está cerrado ese día.' : 'Selecciona una hora.'

    if (!personas || personas < 1) next.num_personas = 'Selecciona la cantidad de personas.'
    else if (personas > capacidadMesa) next.num_personas = `Máximo ${capacidadMesa} personas.`

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handlePreConfirmar = (e) => {
    e.preventDefault()
    if (!validar()) return
    setMostrarConfirmacion(true)
  }

  const handleConfirmarReserva = async () => {
    setIsSubmitting(true)
    setErrors({})

    const cliente_nombre = form.cliente_nombre.trim()
    const cliente_tel = form.cliente_tel.trim()
    const cliente_email = form.cliente_email.trim()

    // Verificar disponibilidad (optimista, el unique index es la red de seguridad real)
    const { disponible } = await verificarDisponibilidad(mesa.id, form.fecha, form.hora)
    if (!disponible) {
      setErrors({ general: 'La mesa ya fue reservada para ese horario.' })
      setIsSubmitting(false); setMostrarConfirmacion(false); return
    }

    const reserva = { mesa_id: mesa.id, cliente_nombre, cliente_tel, cliente_email, fecha: form.fecha, hora: form.hora, num_personas: personas, estado: 'activa' }
    const { data, error } = await createReserva(reserva)

    if (error) {
      const esConflicto = error.code === '23505' || error.message?.includes('unique')
      setErrors({ general: esConflicto ? 'La mesa fue tomada en el último momento. Elige otro horario o mesa.' : 'No se pudo crear la reserva. Intenta nuevamente.' })
      setIsSubmitting(false); setMostrarConfirmacion(false); return
    }

    await updateMesa(mesa.id, { estado: 'ocupada' })

    setIsSubmitting(false)
    setMostrarConfirmacion(false)
    onReservaCreada({
      mesa_id: mesa.id, cliente_nombre, cliente_tel, cliente_email,
      fecha: form.fecha, hora: form.hora, num_personas: personas, estado: 'activa',
      id: data?.[0]?.id,
      mesa_numero: mesa.numero
    })
  }

  return (
    <section className="reservation-form-card" aria-label={`Formulario de reserva Mesa ${mesa.numero}`}>
      <div className="selected-table-card">
        <p className="eyebrow">Mesa seleccionada</p>
        <h2>Mesa {mesa.numero}</h2>
        <p>{capacidadMesa} {capacidadMesa === 1 ? 'persona' : 'personas'} · {mesa.ubicacion || 'Salón principal'}</p>
      </div>

      {errors.general && <p className="alert alert--error" role="alert">{errors.general}</p>}

      <form className="reservation-form" onSubmit={handlePreConfirmar} noValidate>
        <label htmlFor="rf-nombre">
          <span className="label-text"><User size={14} aria-hidden="true" /> Nombre del cliente</span>
          <input id="rf-nombre" name="cliente_nombre" value={form.cliente_nombre} onChange={handleChange}
            placeholder="Ej: Laura Gómez" autoComplete="name"
            aria-invalid={Boolean(errors.cliente_nombre)} aria-describedby={errors.cliente_nombre ? 'rf-nombre-e' : undefined} />
          {errors.cliente_nombre && <small id="rf-nombre-e" role="alert">{errors.cliente_nombre}</small>}
        </label>

        <label htmlFor="rf-tel">
          <span className="label-text"><Phone size={14} aria-hidden="true" /> Teléfono</span>
          <input id="rf-tel" name="cliente_tel" value={form.cliente_tel} onChange={handleChange}
            placeholder="Ej: 3001234567" autoComplete="tel" inputMode="numeric" maxLength="15"
            aria-invalid={Boolean(errors.cliente_tel)} aria-describedby={errors.cliente_tel ? 'rf-tel-e' : undefined} />
          {errors.cliente_tel && <small id="rf-tel-e" role="alert">{errors.cliente_tel}</small>}
        </label>

        <label htmlFor="rf-email">
          <span className="label-text"><Mail size={14} aria-hidden="true" /> Correo electrónico</span>
          <input id="rf-email" type="email" name="cliente_email" value={form.cliente_email} onChange={handleChange}
            placeholder="cliente@email.com" autoComplete="email" aria-required="true"
            aria-invalid={Boolean(errors.cliente_email)} aria-describedby={errors.cliente_email ? 'rf-email-e' : undefined} />
          {errors.cliente_email && <small id="rf-email-e" role="alert">{errors.cliente_email}</small>}
        </label>

        <label htmlFor="rf-fecha">
          <span className="label-text"><Calendar size={14} aria-hidden="true" /> Fecha de la reserva</span>
          <input id="rf-fecha" ref={fechaInputRef} type="date" name="fecha" value={form.fecha}
            min={getToday()} onClick={abrirFechaPicker} onChange={handleChange}
            aria-invalid={Boolean(errors.fecha)} aria-describedby={errors.fecha ? 'rf-fecha-e' : undefined} />
          {errors.fecha && <small id="rf-fecha-e" role="alert">{errors.fecha}</small>}
        </label>

        <label htmlFor="rf-hora">
          <span className="label-text"><Clock size={14} aria-hidden="true" /> Hora de la reserva</span>
          {cargandoHorarios && <span className="field-hint">Cargando turnos disponibles...</span>}
          {sinHorarios && !cargandoHorarios && (
            <span className="field-hint field-hint--warn"> El restaurante está cerrado ese día.</span>
          )}
          <select id="rf-hora" name="hora" value={form.hora} onChange={handleChange}
            disabled={cargandoHorarios || sinHorarios || slotsHora.length === 0}
            aria-invalid={Boolean(errors.hora)} aria-describedby={errors.hora ? 'rf-hora-e' : undefined}>
            <option value="">-- Selecciona una hora --</option>
            {slotsHora.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.hora && <small id="rf-hora-e" role="alert">{errors.hora}</small>}
        </label>

        <label htmlFor="rf-personas">
          <span className="label-text"><Users size={14} aria-hidden="true" /> Número de personas</span>
          <select id="rf-personas" name="num_personas" value={form.num_personas} onChange={handleChange}
            aria-invalid={Boolean(errors.num_personas)}>
            {opcionesPersonas.map(n => <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>)}
          </select>
          {errors.num_personas && <small role="alert">{errors.num_personas}</small>}
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
        <ConfirmationModal reserva={resumenReserva} isSubmitting={isSubmitting}
          onClose={() => setMostrarConfirmacion(false)} onConfirm={handleConfirmarReserva} />
      )}
    </section>
  )
}

export default ReservaForm
