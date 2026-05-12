import { useCallback, useEffect, useMemo, useState } from 'react'
import { createMesa, deleteMesa, getMesas, updateMesa } from '../services/mesasService'
import { getReservas } from '../services/reservasService'

const estadoReservaActiva = ['activa', 'confirmada']

const initialForm = {
  numero: '',
  capacidad: '2',
  ubicacion: 'Salón principal',
  estado: 'disponible'
}

function AdminPanel({ onMesasChanged }) {
  const [mesas, setMesas] = useState([])
  const [reservas, setReservas] = useState([])
  const [form, setForm] = useState(initialForm)
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

  const handleChange = (event) => {
    const { name, value } = event.target

    const cleanValue = name === 'numero' || name === 'capacidad'
      ? value.replace(/\D/g, '')
      : value

    setForm((currentForm) => ({
      ...currentForm,
      [name]: cleanValue
    }))

    setError('')
    setMensaje('')
  }

  const validarMesa = () => {
    const numero = Number(form.numero)
    const capacidad = Number(form.capacidad)

    if (!numero || numero < 1) {
      return 'Ingresa un número de mesa válido.'
    }

    if (!capacidad || capacidad < 1) {
      return 'Ingresa una capacidad válida.'
    }

    const existeMesa = mesas.some((mesa) => Number(mesa.numero) === numero)

    if (existeMesa) {
      return `Ya existe una mesa con el número ${numero}.`
    }

    return ''
  }

  const handleCrearMesa = async (event) => {
    event.preventDefault()

    const validationError = validarMesa()

    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    setMensaje('')

    const nuevaMesa = {
      numero: Number(form.numero),
      capacidad: Number(form.capacidad),
      ubicacion: form.ubicacion.trim() || null,
      estado: form.estado
    }

    const { error: createError } = await createMesa(nuevaMesa)

    if (createError) {
      console.error(createError)
      setError('No se pudo crear la mesa. Revisa las políticas RLS de Supabase.')
      setSaving(false)
      return
    }

    setForm(initialForm)
    setMensaje('Mesa creada correctamente.')
    await cargarPanel()
    await onMesasChanged()
    setSaving(false)
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

  const handleLiberarMesasSinReserva = async () => {
    const mesasParaLiberar = mesas.filter((mesa) => {
      return mesa.estado === 'ocupada' && !mesasConReservaActiva.has(mesa.id)
    })

    if (mesasParaLiberar.length === 0) {
      setMensaje('No hay mesas ocupadas sin reserva activa.')
      return
    }

    const confirmar = window.confirm(
      `Se liberarán ${mesasParaLiberar.length} mesa(s) ocupada(s) que no tienen reserva activa. ¿Continuar?`
    )

    if (!confirmar) return

    setSaving(true)
    setError('')
    setMensaje('')

    const resultados = await Promise.all(
      mesasParaLiberar.map((mesa) => updateMesa(mesa.id, { estado: 'disponible' }))
    )

    const huboError = resultados.some((resultado) => resultado.error)

    if (huboError) {
      console.error(resultados)
      setError('Algunas mesas no pudieron liberarse.')
      setSaving(false)
      return
    }

    setMensaje('Mesas sin reserva activa liberadas correctamente.')
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
          <button type="button" className="button button--ghost" onClick={handleRecargar} disabled={loading || saving}>
            Recargar datos
          </button>

          <button type="button" className="button button--primary" onClick={handleLiberarMesasSinReserva} disabled={loading || saving}>
            Liberar mesas sin reserva
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

      <form className="admin-form" onSubmit={handleCrearMesa}>
        <h3>Crear nueva mesa</h3>

        <div className="admin-form__grid">
          <label>
            Número de mesa
            <input
              name="numero"
              value={form.numero}
              onChange={handleChange}
              placeholder="Ej: 9"
              inputMode="numeric"
              maxLength="3"
            />
          </label>

          <label>
            Capacidad
            <select name="capacidad" value={form.capacidad} onChange={handleChange}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((capacidad) => (
                <option key={capacidad} value={capacidad}>
                  {capacidad} {capacidad === 1 ? 'persona' : 'personas'}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ubicación
            <select name="ubicacion" value={form.ubicacion} onChange={handleChange}>
              <option value="Salón principal">Salón principal</option>
              <option value="Zona roca">Zona roca</option>
              <option value="Centro">Centro</option>
              <option value="Terraza">Terraza</option>
              <option value="Barra">Barra</option>
            </select>
          </label>

          <label>
            Estado inicial
            <select name="estado" value={form.estado} onChange={handleChange}>
              <option value="disponible">Disponible</option>
              <option value="ocupada">Ocupada</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear mesa'}
          </button>
        </div>
      </form>

      <div className="admin-table-card">
        <div className="admin-table-card__header">
          <h3>Mesas registradas</h3>
          <p>
            Si eliminaste reservas directamente en Supabase, usa “Liberar mesas sin reserva”.
          </p>
        </div>

        {loading ? (
          <div className="admin-loading">Cargando información del salón...</div>
        ) : mesas.length === 0 ? (
          <div className="no-tables">
            <h3>No hay mesas registradas</h3>
            <p>Crea la primera mesa desde el formulario superior.</p>
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
    </section>
  )
}

export default AdminPanel