import { useCallback, useEffect, useMemo, useState } from 'react'
import CreateMesaModal from './CreateMesaModal'
import { deleteMesa, getMesas, updateMesa } from '../services/mesasService'
import { getReservas } from '../services/reservasService'

const estadoReservaActiva = ['activa', 'confirmada']

function AdminPanel({ onMesasChanged }) {
  const [mesas, setMesas] = useState([])
  const [reservas, setReservas] = useState([])
  const [showCreateMesaModal, setShowCreateMesaModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargarPanel = useCallback(async () => {
    setLoading(true)
    setError('')
    setMensaje('')

    const [mesasResponse, reservasResponse] = await Promise.all([
      getMesas(),
      getReservas()
    ])

    if (mesasResponse.error) {
      console.error(mesasResponse.error)
      setError('No se pudieron cargar las mesas.')
      setMesas([])
    } else {
      setMesas(mesasResponse.data || [])
    }

    if (reservasResponse.error) {
      console.error(reservasResponse.error)
      setError('No se pudieron cargar las reservas.')
      setReservas([])
    } else {
      setReservas(reservasResponse.data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    cargarPanel()
  }, [cargarPanel])

  const mesasConReservaActiva = useMemo(() => {
    return new Set(
      reservas
        .filter((reserva) => estadoReservaActiva.includes(reserva.estado))
        .map((reserva) => reserva.mesa_id)
    )
  }, [reservas])

  const resumenAdmin = useMemo(() => {
    const disponibles = mesas.filter((mesa) => mesa.estado === 'disponible').length
    const ocupadas = mesas.filter((mesa) => mesa.estado === 'ocupada').length
    const reservasActivas = reservas.filter((reserva) => estadoReservaActiva.includes(reserva.estado)).length

    return {
      disponibles,
      ocupadas,
      reservasActivas
    }
  }, [mesas, reservas])

  const handleMesaCreada = async () => {
    setShowCreateMesaModal(false)
    setMensaje('Mesa creada correctamente.')
    await cargarPanel()
    await onMesasChanged()
  }

  const handleCambiarEstado = async (mesa) => {
    const nuevoEstado = mesa.estado === 'ocupada' ? 'disponible' : 'ocupada'

    setSaving(true)
    setError('')
    setMensaje('')

    const { error: updateError } = await updateMesa(mesa.id, { estado: nuevoEstado })

    if (updateError) {
      console.error(updateError)
      setError('No se pudo actualizar el estado de la mesa.')
      setSaving(false)
      return
    }

    setMensaje(`La mesa ${mesa.numero} ahora está ${nuevoEstado}.`)
    await cargarPanel()
    await onMesasChanged()
    setSaving(false)
  }

  const handleEliminarMesa = async (mesa) => {
    const confirmar = window.confirm(`¿Seguro que deseas eliminar la mesa ${mesa.numero}?`)

    if (!confirmar) return

    setSaving(true)
    setError('')
    setMensaje('')

    const { error: deleteError } = await deleteMesa(mesa.id)

    if (deleteError) {
      console.error(deleteError)
      setError('No se pudo eliminar la mesa. Puede tener reservas asociadas o una política RLS bloqueando la acción.')
      setSaving(false)
      return
    }

    setMensaje(`Mesa ${mesa.numero} eliminada correctamente.`)
    await cargarPanel()
    await onMesasChanged()
    setSaving(false)
  }

  const handleRecargar = async () => {
    await cargarPanel()
    await onMesasChanged()
  }

  return (
    <section className="admin-card">
      <div className="admin-card__header">
        <div>
          <p className="eyebrow">Panel del administrador</p>
          <h2>Gestión del salón</h2>
          <p>
            Desde aquí puedes crear mesas, eliminarlas y cambiar su estado manualmente.
          </p>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => setShowCreateMesaModal(true)}
            disabled={loading || saving}
          >
            Crear nueva mesa
          </button>

          <button
            type="button"
            className="button button--ghost"
            onClick={handleRecargar}
            disabled={loading || saving}
          >
            Recargar datos
          </button>

        </div>
      </div>

      <div className="admin-summary">
        <article>
          <strong>{resumenAdmin.disponibles}</strong>
          <span>Disponibles</span>
        </article>
        <article>
          <strong>{resumenAdmin.ocupadas}</strong>
          <span>Ocupadas</span>
        </article>
        <article>
          <strong>{resumenAdmin.reservasActivas}</strong>
          <span>Reservas activas</span>
        </article>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {mensaje && <p className="alert alert--success">{mensaje}</p>}

      <div className="admin-table-card">
        <div className="admin-table-card__header">
          <h3>Mesas registradas</h3>
        </div>

        {loading ? (
          <div className="admin-loading">Cargando información del salón...</div>
        ) : mesas.length === 0 ? (
          <div className="no-tables">
            <h3>No hay mesas registradas</h3>
            <p>Crea la primera mesa desde el botón superior.</p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Capacidad</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Reserva activa</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {mesas.map((mesa) => {
                  const tieneReservaActiva = mesasConReservaActiva.has(mesa.id)

                  return (
                    <tr key={mesa.id}>
                      <td data-label="Mesa">
                        <strong>Mesa {mesa.numero}</strong>
                      </td>

                      <td data-label="Capacidad">
                        {mesa.capacidad} {Number(mesa.capacidad) === 1 ? 'persona' : 'personas'}
                      </td>

                      <td data-label="Ubicación">
                        {mesa.ubicacion || 'Sin ubicación'}
                      </td>

                      <td data-label="Estado">
                        <span className={mesa.estado === 'disponible' ? 'status-pill status-pill--available' : 'status-pill status-pill--occupied'}>
                          {mesa.estado}
                        </span>
                      </td>

                      <td data-label="Reserva activa">
                        {tieneReservaActiva ? (
                          <span className="status-pill status-pill--reservation">Sí</span>
                        ) : (
                          <span className="status-pill status-pill--empty">No</span>
                        )}
                      </td>

                      <td data-label="Acciones">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="mini-button mini-button--state"
                            onClick={() => handleCambiarEstado(mesa)}
                            disabled={saving}
                          >
                            {mesa.estado === 'ocupada' ? 'Desocupar' : 'Ocupar'}
                          </button>

                          <button
                            type="button"
                            className="mini-button mini-button--danger"
                            onClick={() => handleEliminarMesa(mesa)}
                            disabled={saving}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateMesaModal && (
        <CreateMesaModal
          mesas={mesas}
          onClose={() => setShowCreateMesaModal(false)}
          onMesaCreada={handleMesaCreada}
        />
      )}
    </section>
  )
}

export default AdminPanel