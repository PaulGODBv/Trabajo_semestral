import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ChevronDown, Clock, ClipboardList,
  Lock, MoreHorizontal, Pencil, Plus, RefreshCw,
  TableProperties, Trash2, Unlock
} from 'lucide-react'
import CreateMesaModal from './CreateMesaModal'
import EditMesaModal from './EditMesaModal'
import AdminReservas from './AdminReservas'
import AdminHorarios from './AdminHorarios'
import ConfirmDialog from './ConfirmDialog'
import { deleteMesa, getMesas, updateMesa } from '../services/mesasService'
import { cancelarReserva, getReservas, getReservasFuturasActivasPorMesa } from '../services/reservasService'
import { useToast } from '../context/ToastContext'

const ZONAS = ['Zona interior', 'Zona terraza', 'Zona ventana']

// ── Estado visual del tile de mesa ──────────────────────────────
const ESTADO_META = {
  disponible: { bg: 'mesa-tile--disponible', label: 'Disponible', dot: '#72a844' },
  ocupada:    { bg: 'mesa-tile--ocupada',    label: 'Ocupada',    dot: '#9a9288' },
  bloqueada:  { bg: 'mesa-tile--bloqueada',  label: 'Bloqueada',  dot: '#6a7fa8' }
}

// ── Dropdown de opciones adicionales ────────────────────────────
function MoreMenu({ mesa, onBloquear, onDesbloquear, onCambiarEstado, onEliminar, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const act = (fn) => { setOpen(false); fn() }

  return (
    <div className="more-menu-wrap" ref={ref}>
      <button
        type="button"
        className="mini-button mini-button--state more-menu-trigger"
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Más opciones para Mesa ${mesa.numero}`}
      >
        <MoreHorizontal size={14} aria-hidden="true" />
        <ChevronDown size={12} aria-hidden="true" style={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="more-menu-dropdown" role="menu">
          {mesa.estado === 'bloqueada' ? (
            <button role="menuitem" type="button" className="more-menu-item more-menu-item--unlock"
              onClick={() => act(() => onDesbloquear(mesa))}>
              <Unlock size={14} aria-hidden="true" /> Desbloquear mesa
            </button>
          ) : (
            <button role="menuitem" type="button" className="more-menu-item more-menu-item--lock"
              onClick={() => act(() => onBloquear(mesa))}>
              <Lock size={14} aria-hidden="true" /> Bloquear mesa
            </button>
          )}

          {mesa.estado !== 'bloqueada' && (
            <button role="menuitem" type="button" className="more-menu-item"
              onClick={() => act(() => onCambiarEstado(mesa))}>
              {mesa.estado === 'ocupada' ? ' Marcar disponible' : ' Marcar ocupada'}
            </button>
          )}

          <div className="more-menu-divider" role="separator" />

          <button role="menuitem" type="button" className="more-menu-item more-menu-item--danger"
            onClick={() => act(() => onEliminar(mesa))}>
            <Trash2 size={14} aria-hidden="true" /> Eliminar mesa
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tile visual de una mesa (reemplaza la fila de tabla) ─────────
function MesaTile({ mesa, onEditar, onBloquear, onDesbloquear, onCambiarEstado, onEliminar, saving }) {
  const meta = ESTADO_META[mesa.estado] || ESTADO_META.disponible
  return (
    <article className={`mesa-tile ${meta.bg}`} aria-label={`Mesa ${mesa.numero}, ${meta.label}`}>
      <div className="mesa-tile__header">
        <span className="mesa-tile__numero">{mesa.numero}</span>
        <span className="mesa-tile__estado-dot" style={{ background: meta.dot }} aria-hidden="true" />
      </div>

      <div className="mesa-tile__info">
        <span className="mesa-tile__cap">{mesa.capacidad} {mesa.capacidad === 1 ? 'persona' : 'personas'}</span>
        <span className="mesa-tile__estado-label">{meta.label}</span>
      </div>

      <div className="mesa-tile__actions">
        <button
          type="button"
          className="mini-button mini-button--state mesa-tile__edit-btn"
          onClick={() => onEditar(mesa)}
          disabled={saving}
          aria-label={`Editar mesa ${mesa.numero}`}
        >
          <Pencil size={12} aria-hidden="true" /> Editar
        </button>
        <MoreMenu
          mesa={mesa}
          disabled={saving}
          onBloquear={onBloquear}
          onDesbloquear={onDesbloquear}
          onCambiarEstado={onCambiarEstado}
          onEliminar={onEliminar}
        />
      </div>
    </article>
  )
}

export default function AdminPanel({ onMesasChanged }) {
  const { addToast } = useToast()
  const [tab, setTab] = useState('mesas')
  const [mesas, setMesas] = useState([])
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters (mesas)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroCapacidad, setFiltroCapacidad] = useState('')

  // Modals / dialogs
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [mesaAEditar, setMesaAEditar] = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmBloqueo, setConfirmBloqueo] = useState(null)
  const [reservasCanceladas, setReservasCanceladas] = useState([])
  const [showBloqueoAviso, setShowBloqueoAviso] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: dm }, { data: dr }] = await Promise.all([getMesas(), getReservas()])
    setMesas(dm || [])
    setReservas(dr || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── Derived stats ──────────────────────────────────────────────
  const hoy = new Date().toISOString().split('T')[0]
  const stats = useMemo(() => ({
    mesas: mesas.length,
    disponibles: mesas.filter(m => m.estado === 'disponible').length,
    ocupadas: mesas.filter(m => m.estado === 'ocupada').length,
    bloqueadas: mesas.filter(m => m.estado === 'bloqueada').length,
    reservasHoy: reservas.filter(r => r.fecha === hoy && r.estado === 'activa').length,
    reservasActivas: reservas.filter(r => r.estado === 'activa').length
  }), [mesas, reservas, hoy])

  const capacidadesUnicas = useMemo(() =>
    [...new Set(mesas.map(m => m.capacidad))].sort((a, b) => a - b), [mesas])

  const mesasFiltradas = useMemo(() => mesas.filter(m => {
    if (filtroEstado !== 'todos' && m.estado !== filtroEstado) return false
    if (filtroCapacidad && String(m.capacidad) !== filtroCapacidad) return false
    return true
  }), [mesas, filtroEstado, filtroCapacidad])

  const mesasPorZona = useMemo(() => ZONAS.reduce((acc, zona) => {
    const grupo = mesasFiltradas.filter(m => m.ubicacion === zona)
    if (grupo.length) acc[zona] = grupo
    return acc
  }, {}), [mesasFiltradas])

  const sinUbicacion = useMemo(() =>
    mesasFiltradas.filter(m => !ZONAS.includes(m.ubicacion)), [mesasFiltradas])

  // ── Actions ────────────────────────────────────────────────────
  const refresh = async () => { await cargar(); onMesasChanged() }

  const handleCambiarEstado = async (mesa) => {
    if (mesa.estado === 'bloqueada') return
    setSaving(true)
    const nuevo = mesa.estado === 'ocupada' ? 'disponible' : 'ocupada'
    const { error } = await updateMesa(mesa.id, { estado: nuevo })
    if (error) addToast('No se pudo cambiar el estado.', 'error')
    else { addToast(`Mesa ${mesa.numero} → ${nuevo}.`, 'success'); await refresh() }
    setSaving(false)
  }

  const handleSolicitarBloqueo = async (mesa) => {
    setSaving(true)
    const { data } = await getReservasFuturasActivasPorMesa(mesa.id)
    setSaving(false)
    setConfirmBloqueo({ mesa, reservasAfectadas: data || [] })
  }

  const handleConfirmarBloqueo = async () => {
    if (!confirmBloqueo) return
    const { mesa, reservasAfectadas } = confirmBloqueo
    setSaving(true)
    const canceladas = []
    for (const r of reservasAfectadas) {
      const { error } = await cancelarReserva(r.id)
      if (!error) canceladas.push(r)
    }
    const { error } = await updateMesa(mesa.id, { estado: 'bloqueada' })
    if (error) { addToast('No se pudo bloquear la mesa.', 'error'); setSaving(false); setConfirmBloqueo(null); return }
    await refresh()
    setSaving(false); setConfirmBloqueo(null)
    if (canceladas.length > 0) {
      setReservasCanceladas(canceladas); setShowBloqueoAviso(true)
      addToast(`Mesa ${mesa.numero} bloqueada. ${canceladas.length} reserva(s) canceladas.`, 'warning')
    } else {
      addToast(`Mesa ${mesa.numero} bloqueada.`, 'success')
    }
  }

  const handleDesbloquear = async (mesa) => {
    setSaving(true)
    const { error } = await updateMesa(mesa.id, { estado: 'disponible' })
    if (error) addToast('No se pudo desbloquear.', 'error')
    else { addToast(`Mesa ${mesa.numero} disponible nuevamente.`, 'success'); await refresh() }
    setSaving(false)
  }

  const handleConfirmarEliminar = async () => {
    if (!confirmEliminar) return
    setSaving(true)
    const { error } = await deleteMesa(confirmEliminar.id)
    if (error) addToast('No se pudo eliminar. Puede tener reservas asociadas.', 'error')
    else { addToast(`Mesa ${confirmEliminar.numero} eliminada.`, 'success'); await refresh() }
    setSaving(false); setConfirmEliminar(null)
  }

  // ── Tab config ─────────────────────────────────────────────────
  const TABS = [
    {
      id: 'mesas',
      icon: <TableProperties size={18} aria-hidden="true" />,
      label: ' Mesas',
      badge: stats.mesas,
      desc: `${stats.disponibles} disponibles`
    },
    {
      id: 'reservas',
      icon: <ClipboardList size={18} aria-hidden="true" />,
      label: ' Reservas',
      badge: stats.reservasHoy,
      badgeColor: stats.reservasHoy > 0 ? 'badge--hot' : '',
      desc: stats.reservasHoy > 0 ? `${stats.reservasHoy} para hoy` : 'Ver todas'
    },
    {
      id: 'horarios',
      icon: <Clock size={18} aria-hidden="true" />,
      label: 'Horarios',
      desc: 'Turnos y apertura'
    }
  ]

  return (
    <section className="admin-card">

      {/* ── Encabezado ── */}
      <div className="admin-panel-header">
        <p className="eyebrow">Panel del administrador</p>
        <h2>Comidas Rápidas The Gordo</h2>
        <p> Gestiona mesas, reservas y horarios del restaurante desde aquí.</p>
      </div>

      {/* ── Tarjetas de resumen ── */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <strong>{stats.disponibles}</strong>
          <span>Mesas libres</span>
          <i className="admin-stat-dot" style={{ background: '#72a844' }} />
        </div>
        <div className="admin-stat-card">
          <strong>{stats.ocupadas}</strong>
          <span> Ocupadas</span>
          <i className="admin-stat-dot" style={{ background: '#9a9288' }} />
        </div>
        <div className="admin-stat-card">
          <strong>{stats.bloqueadas}</strong>
          <span> Bloqueadas</span>
          <i className="admin-stat-dot" style={{ background: '#6a7fa8' }} />
        </div>
        <div className={`admin-stat-card ${stats.reservasHoy > 0 ? 'admin-stat-card--hot' : ''}`}>
          <strong>{stats.reservasHoy}</strong>
          <span> Reservas hoy</span>
          <i className="admin-stat-dot" style={{ background: '#e87528' }} />
        </div>
      </div>

      {/* ── Aviso de reservas canceladas tras bloqueo ── */}
      {showBloqueoAviso && reservasCanceladas.length > 0 && (
        <div className="admin-aviso admin-aviso--warning" role="alert">
          <div className="admin-aviso__header">
            <AlertTriangle size={18} aria-hidden="true" />
            <strong>Debes contactar a {reservasCanceladas.length} cliente(s) afectado(s)</strong>
            <button type="button" className="modal-close-btn" onClick={() => setShowBloqueoAviso(false)} aria-label="Cerrar aviso">×</button>
          </div>
          <p>Sus reservas fueron canceladas al bloquear la mesa. Llama o escríbeles para avisarles:</p>
          <div className="admin-aviso__clientes">
            {reservasCanceladas.map(r => (
              <div key={r.id} className="admin-aviso__cliente">
                <strong>{r.cliente_nombre}</strong>
                <a href={`tel:${r.cliente_tel}`}> {r.cliente_tel}</a>
                <a href={`mailto:${r.cliente_email}`}> {r.cliente_email}</a>
                <span> {r.fecha} · {r.hora?.slice(0, 5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Navegación de tabs ── */}
      <nav className="admin-tab-nav" role="tablist" aria-label="Secciones del panel">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`admin-tab-btn ${tab === t.id ? 'admin-tab-btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="admin-tab-btn__icon">{t.icon}</span>
            <span className="admin-tab-btn__text">
              <span className="admin-tab-btn__label">
                {t.label}
                {t.badge != null && (
                  <span className={`admin-tab-badge ${t.badgeColor || ''}`}>{t.badge}</span>
                )}
              </span>
              <span className="admin-tab-btn__desc">{t.desc}</span>
            </span>
          </button>
        ))}
      </nav>

      {/* ══ TAB: MESAS ══════════════════════════════════════════ */}
      {tab === 'mesas' && (
        <div id="panel-mesas" role="tabpanel" aria-label="Gestión de mesas">

          {/* Barra de acciones + filtros */}
          <div className="admin-section-toolbar">
            <div className="admin-section-toolbar__filters">
              <label htmlFor="fm-estado" className="toolbar-filter-label">
                Estado
                <select id="fm-estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="disponible">Disponible</option>
                  <option value="ocupada"> Ocupada</option>
                  <option value="bloqueada"> Bloqueada</option>
                </select>
              </label>
              <label htmlFor="fm-cap" className="toolbar-filter-label">
                Capacidad
                <select id="fm-cap" value={filtroCapacidad} onChange={e => setFiltroCapacidad(e.target.value)}>
                  <option value="">Todas</option>
                  {capacidadesUnicas.map(c => (
                    <option key={c} value={c}>{c} {c === 1 ? 'persona' : 'personas'}</option>
                  ))}
                </select>
              </label>
              {(filtroEstado !== 'todos' || filtroCapacidad) && (
                <button type="button" className="toolbar-clear-btn"
                  onClick={() => { setFiltroEstado('todos'); setFiltroCapacidad('') }}>
                  Limpiar
                </button>
              )}
            </div>
            <div className="admin-section-toolbar__actions">
              <button type="button" className="button button--ghost" onClick={refresh} disabled={loading || saving}>
                <RefreshCw size={14} aria-hidden="true" />
              </button>
              <button type="button" className="button button--primary" onClick={() => setShowCreateModal(true)} disabled={saving}>
                <Plus size={14} aria-hidden="true" /> Nueva mesa
              </button>
            </div>
          </div>

          {/* Leyenda de estados */}
          <div className="mesas-leyenda">
            {Object.entries(ESTADO_META).map(([k, v]) => (
              <span key={k} className="mesas-leyenda__item">
                <i style={{ background: v.dot }} aria-hidden="true" />
                {v.label}
              </span>
            ))}
          </div>

          {/* Mesas por zona */}
          {loading ? (
            <div className="admin-loading">Cargando mesas...</div>
          ) : mesasFiltradas.length === 0 ? (
            <div className="no-tables">
              <h3>Sin resultados</h3>
              <p>No hay mesas con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="admin-zonas-wrap">
              {Object.entries(mesasPorZona).map(([zona, grupo]) => (
                <section key={zona} className="admin-zona-section">
                  <header className="admin-zona-section__header">
                    <h3>{zona}</h3>
                    <div className="admin-zona-section__pills">
                      <span className="zona-pill zona-pill--green">{grupo.filter(m => m.estado === 'disponible').length} libres</span>
                      {grupo.filter(m => m.estado === 'ocupada').length > 0 && (
                        <span className="zona-pill zona-pill--gray">{grupo.filter(m => m.estado === 'ocupada').length} ocupadas</span>
                      )}
                      {grupo.filter(m => m.estado === 'bloqueada').length > 0 && (
                        <span className="zona-pill zona-pill--blue">{grupo.filter(m => m.estado === 'bloqueada').length} bloqueadas</span>
                      )}
                    </div>
                  </header>
                  <div className="mesa-tiles-grid">
                    {grupo.map(mesa => (
                      <MesaTile
                        key={mesa.id}
                        mesa={mesa}
                        saving={saving}
                        onEditar={setMesaAEditar}
                        onBloquear={handleSolicitarBloqueo}
                        onDesbloquear={handleDesbloquear}
                        onCambiarEstado={handleCambiarEstado}
                        onEliminar={setConfirmEliminar}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {sinUbicacion.length > 0 && (
                <section className="admin-zona-section">
                  <header className="admin-zona-section__header">
                    <h3>Sin zona asignada</h3>
                  </header>
                  <div className="mesa-tiles-grid">
                    {sinUbicacion.map(mesa => (
                      <MesaTile key={mesa.id} mesa={mesa} saving={saving}
                        onEditar={setMesaAEditar} onBloquear={handleSolicitarBloqueo}
                        onDesbloquear={handleDesbloquear} onCambiarEstado={handleCambiarEstado}
                        onEliminar={setConfirmEliminar} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: RESERVAS ═══════════════════════════════════════ */}
      {tab === 'reservas' && (
        <div id="panel-reservas" role="tabpanel" aria-label="Gestión de reservas">
          <AdminReservas onDataChanged={cargar} />
        </div>
      )}

      {/* ══ TAB: HORARIOS ═══════════════════════════════════════ */}
      {tab === 'horarios' && (
        <div id="panel-horarios" role="tabpanel" aria-label="Gestión de horarios">
          <AdminHorarios />
        </div>
      )}

      {/* ── Modales ── */}
      {showCreateModal && (
        <CreateMesaModal mesas={mesas} onClose={() => setShowCreateModal(false)}
          onMesaCreada={async () => {
            setShowCreateModal(false)
            addToast('Mesa creada correctamente.', 'success')
            await refresh()
          }} />
      )}

      {mesaAEditar && (
        <EditMesaModal mesa={mesaAEditar} addToast={addToast}
          onClose={() => setMesaAEditar(null)}
          onMesaEditada={async () => {
            setMesaAEditar(null)
            addToast('Mesa actualizada.', 'success')
            await refresh()
          }} />
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmEliminar)}
        title="Eliminar mesa"
        message={confirmEliminar ? `¿Eliminar Mesa ${confirmEliminar.numero} permanentemente? No se puede deshacer.` : ''}
        onConfirm={handleConfirmarEliminar}
        onCancel={() => setConfirmEliminar(null)}
        confirmLabel="Sí, eliminar" cancelLabel="Cancelar"
        variant="danger" isLoading={saving}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmBloqueo)}
        title={confirmBloqueo?.reservasAfectadas?.length > 0 ? ' Esta mesa tiene reservas activas' : 'Bloquear mesa'}
        message={confirmBloqueo?.reservasAfectadas?.length > 0
          ? `La Mesa ${confirmBloqueo.mesa.numero} tiene ${confirmBloqueo.reservasAfectadas.length} reserva(s) próxima(s). Al bloquearla se cancelarán automáticamente y deberás avisarle a cada cliente.`
          : `¿Bloquear Mesa ${confirmBloqueo?.mesa.numero}? Quedará inhabilitada para reservas hasta que la desbloquees.`
        }
        reservasCards={confirmBloqueo?.reservasAfectadas?.length > 0 ? confirmBloqueo.reservasAfectadas : undefined}
        onConfirm={handleConfirmarBloqueo}
        onCancel={() => setConfirmBloqueo(null)}
        confirmLabel={confirmBloqueo?.reservasAfectadas?.length > 0 ? 'Bloquear y cancelar reservas' : 'Sí, bloquear'}
        cancelLabel="No bloquear"
        variant={confirmBloqueo?.reservasAfectadas?.length > 0 ? 'warning' : 'default'}
        isLoading={saving}
      />
    </section>
  )
}
