import { useCallback, useEffect, useMemo, useState } from 'react'
import CreateMesaModal from './CreateMesaModal'
import EditMesaModal from './EditMesaModal'
import AdminReservas from './AdminReservas'
import AdminHorarios from './AdminHorarios'
import ConfirmDialog from './ConfirmDialog'
import { deleteMesa, getMesas, updateMesa } from '../services/mesasService'
import { getReservasFuturasActivasPorMesa, cancelarReserva } from '../services/reservasService'
import { useToast } from '../context/ToastContext'

const TABS = [
  { id: 'mesas', label: '🪨 Mesas' },
  { id: 'reservas', label: '📋 Reservas' },
  { id: 'horarios', label: '🕐 Horarios' }
]

export default function AdminPanel({ onMesasChanged }) {
  const { addToast } = useToast()
  const [tab, setTab] = useState('mesas')
  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [mesaAEditar, setMesaAEditar] = useState(null)

  // Confirm dialogs state
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmBloqueo, setConfirmBloqueo] = useState(null) // { mesa, reservasAfectadas }
  const [reservasCanceladas, setReservasCanceladas] = useState([])
  const [showBloqueoResultado, setShowBloqueoResultado] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getMesas()
    if (error) {
      addToast('No se pudieron cargar las mesas.', 'error')
      setMesas([])
    } else {
      setMesas(data || [])
    }
    setLoading(false)
  }, [addToast])

  useEffect(() => { cargar() }, [cargar])

  const resumen = useMemo(() => ({
    total: mesas.length,
    disponibles: mesas.filter((m) => m.estado === 'disponible').length,
    ocupadas: mesas.filter((m) => m.estado === 'ocupada').length,
    bloqueadas: mesas.filter((m) => m.estado === 'bloqueada').length
  }), [mesas])

  // ── Cambiar estado manual disponible/ocupada ──
  const handleCambiarEstado = async (mesa) => {
    if (mesa.estado === 'bloqueada') return
    const nuevo = mesa.estado === 'ocupada' ? 'disponible' : 'ocupada'
    setSaving(true)
    const { error } = await updateMesa(mesa.id, { estado: nuevo })
    if (error) {
      addToast('No se pudo cambiar el estado de la mesa.', 'error')
    } else {
      addToast(`Mesa ${mesa.numero} marcada como ${nuevo}.`, 'success')
      await cargar()
      onMesasChanged()
    }
    setSaving(false)
  }

  // ── Bloquear mesa (RF-12) ──
  const handleSolicitarBloqueo = async (mesa) => {
    setSaving(true)
    const { data: reservasFuturas } = await getReservasFuturasActivasPorMesa(mesa.id)
    setSaving(false)

    if (reservasFuturas && reservasFuturas.length > 0) {
      setConfirmBloqueo({ mesa, reservasAfectadas: reservasFuturas })
    } else {
      setConfirmBloqueo({ mesa, reservasAfectadas: [] })
    }
  }

  const handleConfirmarBloqueo = async () => {
    if (!confirmBloqueo) return
    const { mesa, reservasAfectadas } = confirmBloqueo
    setSaving(true)

    // Cancelar reservas activas futuras
    const canceladas = []
    for (const r of reservasAfectadas) {
      const { error } = await cancelarReserva(r.id)
      if (!error) canceladas.push(r)
    }

    // Bloquear mesa
    const { error } = await updateMesa(mesa.id, { estado: 'bloqueada' })
    if (error) {
      addToast('No se pudo bloquear la mesa.', 'error')
      setSaving(false)
      setConfirmBloqueo(null)
      return
    }

    await cargar()
    onMesasChanged()
    setSaving(false)
    setConfirmBloqueo(null)

    if (canceladas.length > 0) {
      setReservasCanceladas(canceladas)
      setShowBloqueoResultado(true)
      addToast(`Mesa ${mesa.numero} bloqueada. Se cancelaron ${canceladas.length} reserva(s) activas.`, 'warning')
    } else {
      addToast(`Mesa ${mesa.numero} bloqueada correctamente.`, 'success')
    }
  }

  // ── Desbloquear mesa ──
  const handleDesbloquear = async (mesa) => {
    setSaving(true)
    const { error } = await updateMesa(mesa.id, { estado: 'disponible' })
    if (error) {
      addToast('No se pudo desbloquear la mesa.', 'error')
    } else {
      addToast(`Mesa ${mesa.numero} desbloqueada y disponible nuevamente.`, 'success')
      await cargar()
      onMesasChanged()
    }
    setSaving(false)
  }

  // ── Eliminar mesa ──
  const handleSolicitarEliminar = (mesa) => setConfirmEliminar(mesa)

  const handleConfirmarEliminar = async () => {
    if (!confirmEliminar) return
    setSaving(true)
    const { error } = await deleteMesa(confirmEliminar.id)
    if (error) {
      addToast('No se pudo eliminar la mesa. Puede tener reservas asociadas.', 'error')
    } else {
      addToast(`Mesa ${confirmEliminar.numero} eliminada correctamente.`, 'success')
      await cargar()
      onMesasChanged()
    }
    setSaving(false)
    setConfirmEliminar(null)
  }

  const estadoPill = (estado) => {
    if (estado === 'disponible') return <span className="status-pill status-pill--available">{estado}</span>
    if (estado === 'ocupada') return <span className="status-pill status-pill--occupied">{estado}</span>
    if (estado === 'bloqueada') return <span className="status-pill status-pill--blocked">{estado}</span>
    return <span className="status-pill">{estado}</span>
  }

  return (
    <section className="admin-card">
      <div className="admin-card__header">
        <div>
          <p className="eyebrow">Panel del administrador</p>
          <h2>Gestión del restaurante</h2>
          <p>Administra mesas, visualiza reservas y configura los horarios de atención.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="admin-summary" style={{ gridTemplateColumns: 'repeat(4,minmax(130px,1fr))' }}>
        <article><strong>{resumen.total}</strong><span>Total mesas</span></article>
        <article><strong>{resumen.disponibles}</strong><span>Disponibles</span></article>
        <article><strong>{resumen.ocupadas}</strong><span>Ocupadas</span></article>
        <article><strong>{resumen.bloqueadas}</strong><span>Bloqueadas</span></article>
      </div>

      {/* Warning: cancelled reservations after blocking */}
      {showBloqueoResultado && reservasCanceladas.length > 0 && (
        <div className="bloqueo-resultado" role="alert">
          <div className="bloqueo-resultado__header">
            <strong>⚠️ Aviso: Debes contactar a los clientes afectados</strong>
            <button type="button" className="toast__close" onClick={() => setShowBloqueoResultado(false)} aria-label="Cerrar aviso">×</button>
          </div>
          <p>Las siguientes reservas fueron canceladas automáticamente al bloquear la mesa. Por favor comunícate con cada cliente:</p>
          <div className="bloqueo-clientes">
            {reservasCanceladas.map((r) => (
              <div key={r.id} className="bloqueo-cliente-card">
                <strong>{r.cliente_nombre}</strong>
                <span>📞 <a href={`tel:${r.cliente_tel}`}>{r.cliente_tel}</a></span>
                <span>✉️ <a href={`mailto:${r.cliente_email}`}>{r.cliente_email}</a></span>
                <span>🗓️ {r.fecha} · {r.hora?.slice(0,5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="view-switch" role="tablist" aria-label="Secciones del panel">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`tab-panel-${t.id}`}
            className={tab === t.id ? 'view-switch__button view-switch__button--active' : 'view-switch__button'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Mesas */}
      {tab === 'mesas' && (
        <div id="tab-panel-mesas" role="tabpanel" aria-label="Gestión de mesas">
          <div className="admin-actions" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="button button--primary"
              onClick={() => setShowCreateModal(true)}
              disabled={loading || saving}
            >
              + Nueva mesa
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => { cargar(); onMesasChanged() }}
              disabled={loading || saving}
            >
              Actualizar
            </button>
          </div>

          <div className="admin-table-card">
            <div className="admin-table-card__header">
              <h3>Mesas registradas</h3>
            </div>

            {loading ? (
              <div className="admin-loading">Cargando mesas...</div>
            ) : mesas.length === 0 ? (
              <div className="no-tables"><h3>Sin mesas</h3><p>Crea la primera mesa desde el botón superior.</p></div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mesa</th>
                      <th>Capacidad</th>
                      <th>Ubicación</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mesas.map((mesa) => (
                      <tr key={mesa.id}>
                        <td data-label="Mesa"><strong>Mesa {mesa.numero}</strong></td>
                        <td data-label="Capacidad">{mesa.capacidad} {Number(mesa.capacidad) === 1 ? 'persona' : 'personas'}</td>
                        <td data-label="Ubicación">{mesa.ubicacion || '–'}</td>
                        <td data-label="Estado">{estadoPill(mesa.estado)}</td>
                        <td data-label="Acciones">
                          <div className="table-actions">
                            {/* Editar (RF-11) */}
                            <button
                              type="button"
                              className="mini-button mini-button--state"
                              onClick={() => setMesaAEditar(mesa)}
                              disabled={saving}
                              aria-label={`Editar mesa ${mesa.numero}`}
                            >
                              Editar
                            </button>

                            {/* Bloquear / Desbloquear (RF-12) */}
                            {mesa.estado === 'bloqueada' ? (
                              <button
                                type="button"
                                className="mini-button mini-button--unlock"
                                onClick={() => handleDesbloquear(mesa)}
                                disabled={saving}
                                aria-label={`Desbloquear mesa ${mesa.numero}`}
                              >
                                Desbloquear
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="mini-button mini-button--lock"
                                onClick={() => handleSolicitarBloqueo(mesa)}
                                disabled={saving}
                                aria-label={`Bloquear mesa ${mesa.numero}`}
                              >
                                Bloquear
                              </button>
                            )}

                            {/* Cambiar ocupada/disponible (solo si no está bloqueada) */}
                            {mesa.estado !== 'bloqueada' && (
                              <button
                                type="button"
                                className="mini-button mini-button--state"
                                onClick={() => handleCambiarEstado(mesa)}
                                disabled={saving}
                              >
                                {mesa.estado === 'ocupada' ? 'Desocupar' : 'Ocupar'}
                              </button>
                            )}

                            {/* Eliminar */}
                            <button
                              type="button"
                              className="mini-button mini-button--danger"
                              onClick={() => handleSolicitarEliminar(mesa)}
                              disabled={saving}
                              aria-label={`Eliminar mesa ${mesa.numero}`}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Reservas */}
      {tab === 'reservas' && (
        <div id="tab-panel-reservas" role="tabpanel" aria-label="Gestión de reservas" style={{ marginTop: 20 }}>
          <AdminReservas />
        </div>
      )}

      {/* Tab: Horarios */}
      {tab === 'horarios' && (
        <div id="tab-panel-horarios" role="tabpanel" aria-label="Gestión de horarios" style={{ marginTop: 20 }}>
          <AdminHorarios />
        </div>
      )}

      {/* Modales */}
      {showCreateModal && (
        <CreateMesaModal
          mesas={mesas}
          onClose={() => setShowCreateModal(false)}
          onMesaCreada={async () => {
            setShowCreateModal(false)
            addToast('Mesa creada correctamente.', 'success')
            await cargar()
            onMesasChanged()
          }}
        />
      )}

      {mesaAEditar && (
        <EditMesaModal
          mesa={mesaAEditar}
          onClose={() => setMesaAEditar(null)}
          onMesaEditada={async () => {
            setMesaAEditar(null)
            addToast('Mesa actualizada correctamente.', 'success')
            await cargar()
            onMesasChanged()
          }}
        />
      )}

      {/* Confirm: Eliminar mesa */}
      <ConfirmDialog
        isOpen={Boolean(confirmEliminar)}
        title="Eliminar mesa"
        message={confirmEliminar
          ? `¿Seguro que deseas eliminar la Mesa ${confirmEliminar.numero}? Esta acción no se puede deshacer.`
          : ''}
        onConfirm={handleConfirmarEliminar}
        onCancel={() => setConfirmEliminar(null)}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={saving}
      />

      {/* Confirm: Bloquear mesa */}
      <ConfirmDialog
        isOpen={Boolean(confirmBloqueo)}
        title={confirmBloqueo?.reservasAfectadas?.length > 0 ? '⚠️ Bloquear mesa con reservas activas' : 'Bloquear mesa'}
        message={
          confirmBloqueo?.reservasAfectadas?.length > 0
            ? `La Mesa ${confirmBloqueo.mesa.numero} tiene ${confirmBloqueo.reservasAfectadas.length} reserva(s) activa(s) próximas. Al bloquearla se cancelarán automáticamente y deberás avisar a los clientes.`
            : `¿Confirmas el bloqueo de la Mesa ${confirmBloqueo?.mesa.numero}? Los clientes no podrán reservarla hasta que la desbloquees.`
        }
        details={confirmBloqueo?.reservasAfectadas?.length > 0
          ? confirmBloqueo.reservasAfectadas.map((r) =>
              `${r.fecha} ${r.hora?.slice(0,5)} — ${r.cliente_nombre} · 📞 ${r.cliente_tel} · ✉️ ${r.cliente_email}`
            )
          : []
        }
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
