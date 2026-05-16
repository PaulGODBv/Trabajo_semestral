import { useCallback, useEffect, useMemo, useState } from 'react'
import { cancelarReserva, getReservas } from '../services/reservasService'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from './ConfirmDialog'

const getToday = () => new Date().toISOString().split('T')[0]

export default function AdminReservas() {
  const { addToast } = useToast()
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)

  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroMesa, setFiltroMesa] = useState('')

  const [cancelando, setCancelando] = useState(null)
  const [confirmCancelar, setConfirmCancelar] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getReservas()
    if (error) {
      addToast('No se pudieron cargar las reservas.', 'error')
      setReservas([])
    } else {
      setReservas(data || [])
    }
    setLoading(false)
  }, [addToast])

  useEffect(() => { cargar() }, [cargar])

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r) => {
      if (filtroFecha && r.fecha !== filtroFecha) return false
      if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false
      if (filtroMesa) {
        const numMesa = r.mesas?.numero ?? r.mesa_id
        if (!String(numMesa).includes(filtroMesa)) return false
      }
      return true
    })
  }, [reservas, filtroFecha, filtroEstado, filtroMesa])

  const estadisticas = useMemo(() => ({
    total: reservas.length,
    activas: reservas.filter((r) => r.estado === 'activa' || r.estado === 'confirmada').length,
    hoy: reservas.filter((r) => r.fecha === getToday() && (r.estado === 'activa' || r.estado === 'confirmada')).length
  }), [reservas])

  const handleSolicitarCancelar = (reserva) => setConfirmCancelar(reserva)

  const handleConfirmarCancelar = async () => {
    if (!confirmCancelar) return
    setCancelando(confirmCancelar.id)
    const { error } = await cancelarReserva(confirmCancelar.id)
    if (error) {
      addToast('No se pudo cancelar la reserva.', 'error')
    } else {
      addToast(`Reserva de ${confirmCancelar.cliente_nombre} cancelada correctamente.`, 'success')
      await cargar()
    }
    setCancelando(null)
    setConfirmCancelar(null)
  }

  const estadoPill = (estado) => {
    if (estado === 'activa' || estado === 'confirmada')
      return <span className="status-pill status-pill--reservation">{estado}</span>
    if (estado === 'cancelada')
      return <span className="status-pill status-pill--occupied">{estado}</span>
    return <span className="status-pill status-pill--empty">{estado}</span>
  }

  return (
    <div>
      <div className="admin-summary" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <article><strong>{estadisticas.total}</strong><span>Total reservas</span></article>
        <article><strong>{estadisticas.activas}</strong><span>Activas</span></article>
        <article><strong>{estadisticas.hoy}</strong><span>Hoy</span></article>
      </div>

      {/* Filtros */}
      <div className="admin-table-card">
        <div className="admin-table-card__header">
          <h3>Filtros</h3>
        </div>
        <div className="reservas-filtros">
          <label htmlFor="fil-fecha">
            Fecha
            <input
              id="fil-fecha"
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
            />
          </label>
          <label htmlFor="fil-estado">
            Estado
            <select id="fil-estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="activa">Activa</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>
          <label htmlFor="fil-mesa">
            Mesa N°
            <input
              id="fil-mesa"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 3"
              value={filtroMesa}
              onChange={(e) => setFiltroMesa(e.target.value.replace(/\D/g, ''))}
              style={{ maxWidth: 120 }}
            />
          </label>
          {(filtroFecha || filtroEstado !== 'todos' || filtroMesa) && (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => { setFiltroFecha(''); setFiltroEstado('todos'); setFiltroMesa('') }}
              style={{ alignSelf: 'flex-end' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="admin-table-card" style={{ marginTop: 16 }}>
        <div className="admin-table-card__header">
          <h3>Reservas ({reservasFiltradas.length})</h3>
          <button type="button" className="mini-button mini-button--state" onClick={cargar} disabled={loading}>
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">Cargando reservas...</div>
        ) : reservasFiltradas.length === 0 ? (
          <div className="no-tables"><h3>Sin resultados</h3><p>No hay reservas con los filtros aplicados.</p></div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Fecha · Hora</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Personas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasFiltradas.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Mesa">
                      <strong>Mesa {r.mesas?.numero ?? '–'}</strong>
                      <br /><small>{r.mesas?.ubicacion ?? ''}</small>
                    </td>
                    <td data-label="Fecha · Hora">
                      <strong>{r.fecha}</strong><br />{r.hora?.slice(0,5)}
                    </td>
                    <td data-label="Cliente"><strong>{r.cliente_nombre}</strong></td>
                    <td data-label="Teléfono">
                      <a href={`tel:${r.cliente_tel}`} className="contact-link">{r.cliente_tel}</a>
                    </td>
                    <td data-label="Correo">
                      <a href={`mailto:${r.cliente_email}`} className="contact-link">{r.cliente_email || '–'}</a>
                    </td>
                    <td data-label="Personas">{r.num_personas}</td>
                    <td data-label="Estado">{estadoPill(r.estado)}</td>
                    <td data-label="Acciones">
                      {(r.estado === 'activa' || r.estado === 'confirmada') && (
                        <button
                          type="button"
                          className="mini-button mini-button--danger"
                          onClick={() => handleSolicitarCancelar(r)}
                          disabled={cancelando === r.id}
                          aria-label={`Cancelar reserva de ${r.cliente_nombre}`}
                        >
                          {cancelando === r.id ? '...' : 'Cancelar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmCancelar)}
        title="Cancelar reserva"
        message={confirmCancelar
          ? `¿Confirmas la cancelación de la reserva de ${confirmCancelar.cliente_nombre} para el ${confirmCancelar.fecha} a las ${confirmCancelar.hora?.slice(0,5)}?`
          : ''}
        onConfirm={handleConfirmarCancelar}
        onCancel={() => setConfirmCancelar(null)}
        confirmLabel="Sí, cancelar reserva"
        cancelLabel="No, mantenerla"
        variant="danger"
        isLoading={Boolean(cancelando)}
      />
    </div>
  )
}
