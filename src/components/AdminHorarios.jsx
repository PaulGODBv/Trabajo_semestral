import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { getHorarios, guardarHorario, eliminarHorario } from '../services/horariosService'
import { useToast } from '../context/ToastContext'
import { ORDEN_DIAS, NOMBRES_DIAS, normalizarHora, generarSlots } from '../utils/horarios'

let _tid = 0
const newId = () => `_new_${++_tid}`

const DEFAULTS = { hora_inicio: '12:00', hora_fin: '22:00' }

// ── Input de hora que abre el picker al hacer clic ──────────────
function TimeInput({ id, label, value, onChange }) {
  const ref = useRef(null)
  const open = () => {
    ref.current?.focus()
    try { ref.current?.showPicker?.() } catch { /* noop */ }
  }
  return (
    <div className="htime-field">
      <span className="htime-field__label">{label}</span>
      <button type="button" className="htime-field__trigger" onClick={open} aria-label={`Cambiar ${label}`}>
        <Clock size={13} aria-hidden="true" />
        {value || '--:--'}
      </button>
      <input
        id={id}
        ref={ref}
        type="time"
        value={value}
        onChange={onChange}
        className="htime-field__hidden-input"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}

// ── Un turno dentro de un día ───────────────────────────────────
function TurnoRow({ turno, dia, idx, onActualizar, onEliminar }) {
  const slots = turno.hora_inicio && turno.hora_fin && turno.hora_inicio < turno.hora_fin
    ? generarSlots(turno.hora_inicio, turno.hora_fin)
    : []
  const invalido = turno.hora_inicio && turno.hora_fin && turno.hora_inicio >= turno.hora_fin

  return (
    <div className={`hturno ${turno.activo ? 'hturno--activo' : 'hturno--inactivo'} ${turno._nuevo ? 'hturno--nuevo' : ''}`}>
      {/* Toggle activo/inactivo */}
      <button
        type="button"
        className={`hturno__toggle ${turno.activo ? 'hturno__toggle--on' : ''}`}
        onClick={() => onActualizar(dia, turno._id, 'activo', !turno.activo)}
        aria-pressed={turno.activo}
        title={turno.activo ? 'Turno activo — pulsa para desactivarlo' : 'Turno inactivo — pulsa para activarlo'}
      >
        <span className="hturno__toggle-dot" aria-hidden="true" />
        <span className="hturno__toggle-label">{turno.activo ? 'Activo' : 'Inactivo'}</span>
      </button>

      {/* Horas */}
      <div className="hturno__horas">
        <TimeInput
          id={`hi-${dia}-${idx}`}
          label="Desde"
          value={turno.hora_inicio}
          onChange={e => onActualizar(dia, turno._id, 'hora_inicio', e.target.value)}
        />
        <span className="hturno__arrow" aria-hidden="true">→</span>
        <TimeInput
          id={`hf-${dia}-${idx}`}
          label="Hasta"
          value={turno.hora_fin}
          onChange={e => onActualizar(dia, turno._id, 'hora_fin', e.target.value)}
        />
      </div>

      {/* Horas disponibles para el cliente */}
      {slots.length > 0 && !invalido && (
        <div className="hturno__slots" aria-label="Horas que verán los clientes">
          <span className="hturno__slots-label">Clientes verán:</span>
          {slots.map(s => <span key={s} className="hturno__slot-chip">{s}</span>)}
        </div>
      )}
      {invalido && (
        <p className="field-hint field-hint--warn"> La hora de apertura debe ser antes del cierre.</p>
      )}

      {/* Eliminar */}
      <button
        type="button"
        className="mini-button mini-button--danger hturno__del"
        onClick={() => onEliminar(dia, turno._id)}
        aria-label="Eliminar este turno"
      >
        <Trash2 size={13} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function AdminHorarios() {
  const { addToast } = useToast()
  const [dias, setDias] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getHorarios()
    if (error) { addToast('No se pudieron cargar los horarios.', 'error'); setLoading(false); return }
    const mapa = {}
    for (const dia of ORDEN_DIAS) {
      mapa[dia] = (data || []).filter(h => h.dia_semana === dia).map(h => ({
        _id: h.id, id: h.id,
        hora_inicio: normalizarHora(h.hora_inicio),
        hora_fin: normalizarHora(h.hora_fin),
        activo: h.activo,
        _nuevo: false, _modificado: false, _eliminar: false
      }))
    }
    setDias(mapa)
    setLoading(false)
  }, [addToast])

  useEffect(() => { cargar() }, [cargar])

  const onActualizar = (dia, _id, campo, valor) => {
    setDias(prev => ({
      ...prev,
      [dia]: prev[dia].map(h => h._id === _id ? { ...h, [campo]: valor, _modificado: true } : h)
    }))
  }

  const onAgregar = (dia) => {
    const tid = newId()
    setDias(prev => ({
      ...prev,
      [dia]: [...(prev[dia] || []), {
        _id: tid, id: null,
        hora_inicio: DEFAULTS.hora_inicio, hora_fin: DEFAULTS.hora_fin,
        activo: true, _nuevo: true, _modificado: false, _eliminar: false
      }]
    }))
  }

  const onEliminar = (dia, _id) => {
    setDias(prev => ({
      ...prev,
      [dia]: prev[dia]
        .map(h => h._id === _id ? (h._nuevo ? null : { ...h, _eliminar: true }) : h)
        .filter(Boolean)
    }))
  }

  const hayPendientes = Object.values(dias).some(rows =>
    rows.some(h => h._modificado || h._nuevo || h._eliminar)
  )

  const validar = () => {
    for (const dia of ORDEN_DIAS) {
      for (const h of dias[dia] || []) {
        if (h._eliminar) continue
        if (!h.hora_inicio || !h.hora_fin) return `${NOMBRES_DIAS[dia]}: faltan horas en un turno.`
        if (h.hora_inicio >= h.hora_fin) return `${NOMBRES_DIAS[dia]}: apertura debe ser antes del cierre.`
      }
    }
    return null
  }

  const handleGuardar = async () => {
    const err = validar()
    if (err) { addToast(err, 'warning'); return }
    setSaving(true)
    let errores = 0
    for (const dia of ORDEN_DIAS) {
      for (const h of (dias[dia] || [])) {
        if (!h._nuevo && !h._modificado && !h._eliminar) continue
        if (h._eliminar && !h._nuevo) {
          const { error } = await eliminarHorario(h.id)
          if (error) errores++
        } else if (h._nuevo && !h._eliminar) {
          const { error } = await guardarHorario({ dia_semana: dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, activo: h.activo })
          if (error) errores++
        } else if (h._modificado && !h._nuevo) {
          const { error } = await guardarHorario({ id: h.id, dia_semana: dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, activo: h.activo })
          if (error) errores++
        }
      }
    }
    await cargar()
    setSaving(false)
    if (errores > 0) addToast(`Guardado con ${errores} error(es).`, 'warning')
    else addToast(' Horarios guardados. Los clientes verán los cambios de inmediato.', 'success')
  }

  if (loading) return <div className="admin-loading">Cargando horarios...</div>

  return (
    <div className="horarios-admin-wrap">

      {/* Instrucción clara */}
      <div className="horarios-ayuda">
        <div className="horarios-ayuda__item">
          <span className="horarios-ayuda__icon"></span>
          <span>Turno <strong>activo</strong> = los clientes pueden reservar en ese horario.</span>
        </div>
        <div className="horarios-ayuda__item">
          <span className="horarios-ayuda__icon"></span>
          <span>Turno <strong>inactivo</strong> = ese horario no aparece para los clientes.</span>
        </div>
        <div className="horarios-ayuda__item">
          <span className="horarios-ayuda__icon"></span>
          <span>Puedes agregar <strong>varios turnos por día</strong> (ej: mañana y tarde).</span>
        </div>
      </div>

      {/* Grid de días */}
      <div className="horarios-grid">
        {ORDEN_DIAS.map(dia => {
          const turnosDia = (dias[dia] || []).filter(h => !h._eliminar)
          const tieneActivos = turnosDia.some(h => h.activo)

          return (
            <div key={dia} className={`hdia ${tieneActivos ? 'hdia--abierto' : 'hdia--cerrado'}`}>
              {/* Cabecera del día */}
              <div className="hdia__header">
                <div className="hdia__header-left">
                  <span className="hdia__nombre">{NOMBRES_DIAS[dia]}</span>
                  <span className={`hdia__estado-label ${tieneActivos ? 'hdia__estado-label--open' : ''}`}>
                    {tieneActivos ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>
                <button
                  type="button"
                  className="mini-button mini-button--state hdia__add-btn"
                  onClick={() => onAgregar(dia)}
                  aria-label={`Agregar turno para ${NOMBRES_DIAS[dia]}`}
                >
                  <Plus size={13} aria-hidden="true" /> Agregar turno
                </button>
              </div>

              {/* Turnos */}
              {turnosDia.length === 0 ? (
                <div className="hdia__vacio">
                  Sin turnos configurados — este día está cerrado para reservas.
                </div>
              ) : (
                <div className="hdia__turnos">
                  {turnosDia.map((h, idx) => (
                    <TurnoRow
                      key={h._id}
                      turno={h}
                      dia={dia}
                      idx={idx}
                      onActualizar={onActualizar}
                      onEliminar={onEliminar}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botón guardar fijo */}
      <div className="horarios-footer">
        <div className="horarios-footer__info">
          {hayPendientes
            ? <span className="horarios-footer__pending"> Tienes cambios sin guardar</span>
            : <span className="horarios-footer__ok"> Todo guardado</span>}
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={handleGuardar}
          disabled={saving || !hayPendientes}
        >
          {saving ? 'Guardando...' : ' Guardar todos los cambios'}
        </button>
      </div>
    </div>
  )
}
