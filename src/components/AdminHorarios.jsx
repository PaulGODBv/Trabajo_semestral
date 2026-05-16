import { useCallback, useEffect, useState } from 'react'
import { getHorarios, guardarHorario, eliminarHorario } from '../services/horariosService'
import { useToast } from '../context/ToastContext'
import { ORDEN_DIAS, NOMBRES_DIAS, normalizarHora } from '../utils/horarios'

const DEFAULTS = { hora_inicio: '12:00', hora_fin: '22:00' }

export default function AdminHorarios() {
  const { addToast } = useToast()
  const [horariosPorDia, setHorariosPorDia] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getHorarios()
    if (error) {
      addToast('No se pudieron cargar los horarios.', 'error')
      setLoading(false)
      return
    }
    const mapa = {}
    for (const dia of ORDEN_DIAS) {
      const existente = data?.find((h) => h.dia_semana === dia)
      mapa[dia] = existente
        ? {
            id: existente.id,
            activo: existente.activo,
            hora_inicio: normalizarHora(existente.hora_inicio),
            hora_fin: normalizarHora(existente.hora_fin),
            _modificado: false
          }
        : { id: null, activo: false, hora_inicio: DEFAULTS.hora_inicio, hora_fin: DEFAULTS.hora_fin, _modificado: false }
    }
    setHorariosPorDia(mapa)
    setLoading(false)
  }, [addToast])

  useEffect(() => { cargar() }, [cargar])

  const handleToggle = (dia) => {
    setHorariosPorDia((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia].activo, _modificado: true }
    }))
  }

  const handleHoraChange = (dia, campo, valor) => {
    setHorariosPorDia((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor, _modificado: true }
    }))
  }

  const validarHorarios = () => {
    for (const dia of ORDEN_DIAS) {
      const h = horariosPorDia[dia]
      if (!h.activo) continue
      if (!h.hora_inicio || !h.hora_fin) return `El día ${NOMBRES_DIAS[dia]} requiere hora de inicio y fin.`
      if (h.hora_inicio >= h.hora_fin) return `En ${NOMBRES_DIAS[dia]} la hora de inicio debe ser antes de la hora de cierre.`
    }
    return null
  }

  const handleGuardar = async () => {
    const errorValidacion = validarHorarios()
    if (errorValidacion) { addToast(errorValidacion, 'warning'); return }

    setSaving(true)
    let errores = 0

    for (const dia of ORDEN_DIAS) {
      const h = horariosPorDia[dia]
      if (!h._modificado) continue

      const { error } = await guardarHorario({
        id: h.id || undefined,
        dia_semana: dia,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        activo: h.activo
      })

      if (error) { errores++; console.error(`Error guardando ${dia}:`, error) }
    }

    await cargar()
    setSaving(false)

    if (errores > 0) {
      addToast(`Se guardaron algunos horarios pero hubo ${errores} error(es). Revisa la consola.`, 'warning')
    } else {
      addToast('Horarios guardados correctamente. Los clientes verán los nuevos turnos disponibles.', 'success')
    }
  }

  if (loading) return <div className="admin-loading">Cargando horarios...</div>

  const hayModificaciones = Object.values(horariosPorDia).some((h) => h._modificado)

  return (
    <div>
      <div className="admin-table-card">
        <div className="admin-table-card__header">
          <div>
            <h3>Horarios de atención</h3>
            <p className="admin-table-card__header" style={{ margin: '6px 0 0', fontSize: '0.92rem', color: '#68442a', fontWeight: 800 }}>
              Los clientes solo podrán reservar en los horarios que actives aquí. Las horas se generan en intervalos de 1 hora.
            </p>
          </div>
        </div>

        <div className="horarios-list">
          {ORDEN_DIAS.map((dia) => {
            const h = horariosPorDia[dia]
            if (!h) return null
            return (
              <div key={dia} className={`horario-item ${h.activo ? 'horario-item--active' : ''}`}>
                <div className="horario-item__left">
                  <button
                    type="button"
                    className={`horario-toggle ${h.activo ? 'horario-toggle--on' : ''}`}
                    onClick={() => handleToggle(dia)}
                    aria-pressed={h.activo}
                    aria-label={`${h.activo ? 'Desactivar' : 'Activar'} ${NOMBRES_DIAS[dia]}`}
                  >
                    {h.activo ? '✓' : '○'}
                  </button>
                  <span className="horario-item__dia">{NOMBRES_DIAS[dia]}</span>
                  {h._modificado && <span className="horario-badge">modificado</span>}
                </div>

                {h.activo && (
                  <div className="horario-item__times">
                    <label htmlFor={`hi-${dia}`}>
                      Apertura
                      <input
                        id={`hi-${dia}`}
                        type="time"
                        value={h.hora_inicio}
                        onChange={(e) => handleHoraChange(dia, 'hora_inicio', e.target.value)}
                      />
                    </label>
                    <span className="horario-separator">→</span>
                    <label htmlFor={`hf-${dia}`}>
                      Cierre
                      <input
                        id={`hf-${dia}`}
                        type="time"
                        value={h.hora_fin}
                        onChange={(e) => handleHoraChange(dia, 'hora_fin', e.target.value)}
                      />
                    </label>
                    {h.hora_inicio && h.hora_fin && h.hora_inicio < h.hora_fin && (
                      <span className="horario-preview">
                        {/* Preview count */}
                        {(() => {
                          const toMin = (t) => { const [a,b] = t.split(':').map(Number); return a*60+b }
                          const slots = Math.floor((toMin(h.hora_fin) - toMin(h.hora_inicio)) / 60)
                          return `${slots} turno${slots !== 1 ? 's' : ''}`
                        })()}
                      </span>
                    )}
                  </div>
                )}

                {!h.activo && (
                  <span className="horario-cerrado">Cerrado</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="horarios-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={handleGuardar}
            disabled={saving || !hayModificaciones}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {!hayModificaciones && (
            <span style={{ color: '#68442a', fontWeight: 800, fontSize: '0.9rem' }}>
              No hay cambios pendientes.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
