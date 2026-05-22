import { useCallback, useEffect, useMemo, useState } from 'react'
import { Phone, Mail, RotateCcw, XCircle } from 'lucide-react'
import { cancelarReserva, getReservas, reactivarReserva, verificarDisponibilidad } from '../services/reservasService'
import { updateMesa } from '../services/mesasService'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from './ConfirmDialog'
import ReasignarMesaModal from './ReasignarMesaModal'

const getToday = () => new Date().toISOString().split('T')[0]

function agrupar(reservas) {
  const hoy = getToday()
  const hoyItems = reservas.filter(r => r.fecha === hoy && r.estado === 'activa')
  const proximas = reservas.filter(r => r.fecha > hoy && r.estado === 'activa')
  // vencidas (fecha pasada + activa) y canceladas van al historial
  const historial = reservas.filter(r => r.fecha < hoy || r.estado === 'cancelada')
  return { hoyItems, proximas, historial }
}

// ── Tarjeta de una reserva ──────────────────────────────────────
function ReservaCard({ r, accionando, onCancelar, onReactivar }) {
  const hoy = getToday()
  const esHoy = r.fecha === hoy
  const esVencida = r.fecha < hoy  // reserva cuya fecha ya pasó

  let stripeClass = 'stripe--proxima'
  if (r.estado === 'cancelada') stripeClass = 'stripe--cancelada'
  else if (esVencida) stripeClass = 'stripe--vencida'
  else if (esHoy) stripeClass = 'stripe--hoy'

  let cardClass = 'reserva-card'
  if (r.estado === 'cancelada') cardClass += ' reserva-card--cancelada'
  else if (esVencida) cardClass += ' reserva-card--vencida'
  else if (esHoy) cardClass += ' reserva-card--hoy'

  return (
    <article className={cardClass}>
      <div className={`reserva-card__stripe ${stripeClass}`} aria-hidden="true" />

      <div className="reserva-card__body">
        <div className="reserva-card__top">
          <div className="reserva-card__mesa-info">
            <span className="reserva-card__mesa-num"> Mesa {r.mesas?.numero ?? '–'}</span>
            <span className="reserva-card__ubicacion">{r.mesas?.ubicacion ?? ''}</span>
          </div>
          <div className="reserva-card__datetime">
            <span className="reserva-card__fecha">{r.fecha}</span>
            <span className="reserva-card__hora">{r.hora?.slice(0, 5)}</span>
          </div>
          <div className="reserva-card__estado-wrap">
            {esVencida && r.estado === 'activa'
              ? <span className="status-pill status-pill--vencida"> vencida</span>
              : r.estado === 'activa'
              ? <span className="status-pill status-pill--reservation"> activa</span>
              : <span className="status-pill status-pill--occupied"> cancelada</span>}
            <span className="reserva-card__personas">{r.num_personas} </span>
          </div>
        </div>

        <div className="reserva-card__client">
          <strong className="reserva-card__nombre">{r.cliente_nombre}</strong>
          <a href={`tel:${r.cliente_tel}`} className="reserva-card__contact">
            {r.cliente_tel}
          </a>
          <a href={`mailto:${r.cliente_email}`} className="reserva-card__contact">
            {r.cliente_email || '–'}
          </a>
        </div>

        <div className="reserva-card__actions">
          {/* Solo cancelar si es activa Y no está vencida */}
          {r.estado === 'activa' && !esVencida && (
            <button type="button" className="mini-button mini-button--danger"
              onClick={() => onCancelar(r)} disabled={accionando === r.id}
              aria-label={`Cancelar reserva de ${r.cliente_nombre}`}>
              <XCircle size={13} aria-hidden="true" />
              {accionando === r.id ? 'Procesando...' : 'Cancelar reserva'}
            </button>
          )}
          {r.estado === 'activa' && esVencida && (
            <span className="reserva-card__vencida-nota"> Esta reserva ya venció — no se puede cancelar</span>
          )}
          {r.estado === 'cancelada' && (
            <button type="button" className="mini-button mini-button--unlock"
              onClick={() => onReactivar(r)} disabled={accionando === r.id}
              aria-label={`Reactivar reserva de ${r.cliente_nombre}`}>
              <RotateCcw size={13} aria-hidden="true" />
              {accionando === r.id ? 'Verificando...' : ' Reactivar'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Sección colapsable de grupo de reservas ────────────────────
function GrupoReservas({ titulo, icono, reservas, accionando, onCancelar, onReactivar, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  if (reservas.length === 0) return null
  return (
    <section className="reservas-grupo">
      <button
        type="button"
        className="reservas-grupo__header"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="reservas-grupo__titulo">
          <span aria-hidden="true">{icono}</span> {titulo}
          <span className="reservas-grupo__count">{reservas.length}</span>
        </span>
        <span className="reservas-grupo__chevron" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div className="reservas-grupo__lista">
          {reservas.map(r => (
            <ReservaCard
              key={r.id}
              r={r}
              accionando={accionando}
              onCancelar={onCancelar}
              onReactivar={onReactivar}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function AdminReservas({ onDataChanged }) {
  const { addToast } = useToast()
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(null)
  const [confirmCancelar, setConfirmCancelar] = useState(null)
  const [reasignarReserva, setReasignarReserva] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('activa')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroMesa, setFiltroMesa] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getReservas()
    if (error) addToast('No se pudieron cargar las reservas.', 'error')
    else setReservas(data || [])
    setLoading(false)
  }, [addToast])

  useEffect(() => { cargar() }, [cargar])

  const reservasFiltradas = useMemo(() => reservas.filter(r => {
    if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false
    if (filtroFecha && r.fecha !== filtroFecha) return false
    if (filtroMesa && !String(r.mesas?.numero ?? '').includes(filtroMesa)) return false
    return true
  }), [reservas, filtroEstado, filtroFecha, filtroMesa])

  const { hoyItems, proximas, historial } = useMemo(() => agrupar(reservasFiltradas), [reservasFiltradas])

  const hoy = getToday()
  const stats = useMemo(() => ({
    activas: reservas.filter(r => r.estado === 'activa').length,
    hoy: reservas.filter(r => r.fecha === hoy && r.estado === 'activa').length,
    canceladas: reservas.filter(r => r.estado === 'cancelada').length,
  }), [reservas, hoy])

  const handleConfirmarCancelar = async () => {
    if (!confirmCancelar) return
    setAccionando(confirmCancelar.id)
    const { error } = await cancelarReserva(confirmCancelar.id)
    if (error) addToast('No se pudo cancelar.', 'error')
    else { addToast(`Reserva de ${confirmCancelar.cliente_nombre} cancelada.`, 'success'); await cargar(); onDataChanged?.() }
    setAccionando(null); setConfirmCancelar(null)
  }

  const handleReactivar = async (r) => {
    setAccionando(r.id)
    const { disponible } = await verificarDisponibilidad(r.mesa_id, r.fecha, r.hora)
    if (disponible) {
      const { error } = await reactivarReserva(r.id, r.mesa_id)
      if (error) addToast('No se pudo reactivar.', 'error')
      else {
        await updateMesa(r.mesa_id, { estado: 'ocupada' })
        addToast(`Reserva de ${r.cliente_nombre} reactivada.`, 'success')
        await cargar(); onDataChanged?.()
      }
    } else {
      setReasignarReserva(r)
    }
    setAccionando(null)
  }

  return (
    <div className="admin-reservas-wrap">

      {/* Stats rápidas */}
      <div className="reservas-stats">
        <div className={`reservas-stat ${stats.hoy > 0 ? 'reservas-stat--hot' : ''}`}>
          <strong>{stats.hoy}</strong><span> Hoy</span>
        </div>
        <div className="reservas-stat">
          <strong>{stats.activas}</strong><span> Activas</span>
        </div>
        <div className="reservas-stat">
          <strong>{stats.canceladas}</strong><span> Canceladas</span>
        </div>
        <button type="button" className="button button--ghost reservas-stat-refresh" onClick={cargar} disabled={loading}>
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="reservas-filtros-bar">
        <label htmlFor="rf-estado">
          Mostrar
          <select id="rf-estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="todos">Todas</option>
            <option value="activa"> Solo activas</option>
            <option value="cancelada"> Solo canceladas</option>
          </select>
        </label>
        <label htmlFor="rf-fecha">
          Fecha
          <input id="rf-fecha" type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
        </label>
        <label htmlFor="rf-mesa">
          Mesa N°
          <input id="rf-mesa" inputMode="numeric" placeholder="Ej: 3" value={filtroMesa}
            onChange={e => setFiltroMesa(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 90 }} />
        </label>
        {(filtroEstado !== 'activa' || filtroFecha || filtroMesa) && (
          <button type="button" className="toolbar-clear-btn"
            onClick={() => { setFiltroEstado('activa'); setFiltroFecha(''); setFiltroMesa('') }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Lista de reservas */}
      {loading ? (
        <div className="admin-loading">Cargando reservas...</div>
      ) : reservasFiltradas.length === 0 ? (
        <div className="no-tables">
          <h3>Sin resultados</h3>
          <p>No hay reservas con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="reservas-grupos-wrap">
          <GrupoReservas
            titulo="Hoy"
            icono=""
            reservas={hoyItems}
            accionando={accionando}
            onCancelar={setConfirmCancelar}
            onReactivar={handleReactivar}
            defaultOpen={true}
          />
          <GrupoReservas
            titulo="Próximas"
            icono=""
            reservas={proximas}
            accionando={accionando}
            onCancelar={setConfirmCancelar}
            onReactivar={handleReactivar}
            defaultOpen={true}
          />
          <GrupoReservas
            titulo="Historial y canceladas"
            icono=""
            reservas={historial}
            accionando={accionando}
            onCancelar={setConfirmCancelar}
            onReactivar={handleReactivar}
            defaultOpen={false}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmCancelar)}
        title="Cancelar reserva"
        message={confirmCancelar
          ? `¿Cancelar la reserva de ${confirmCancelar.cliente_nombre} para el ${confirmCancelar.fecha} a las ${confirmCancelar.hora?.slice(0, 5)}? Esta acción no se puede deshacer desde aquí.`
          : ''}
        onConfirm={handleConfirmarCancelar}
        onCancel={() => setConfirmCancelar(null)}
        confirmLabel="Sí, cancelar" cancelLabel="No, mantenerla"
        variant="danger" isLoading={Boolean(accionando)}
      />

      {reasignarReserva && (
        <ReasignarMesaModal
          reserva={reasignarReserva}
          onClose={() => setReasignarReserva(null)}
          onReactivada={async () => { setReasignarReserva(null); await cargar(); onDataChanged?.() }}
        />
      )}
    </div>
  )
}
