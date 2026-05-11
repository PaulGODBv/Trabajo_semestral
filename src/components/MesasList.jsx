import { useEffect, useState } from 'react'
import { getMesas, deleteMesa } from '../services/mesasService'
import ReservaForm from './ReservaForm'

function MesasList() {
  const [mesas, setMesas] = useState([])
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null)

  const cargarMesas = async () => {
    const { data } = await getMesas()
    setMesas(data || [])
  }

  useEffect(() => {
    cargarMesas()
  }, [])

  const eliminar = async (id) => {
    const confirmar = window.confirm('¿Seguro que deseas eliminar esta mesa?')

    if (!confirmar) return

    await deleteMesa(id)
    cargarMesas()
  }

  return (
    <div>
      <h2>Mesas</h2>

      <div style={{ display: 'grid', gap: '10px' }}>
        {mesas.map((mesa) => (
          <div key={mesa.id} style={{ border: '1px solid #ccc', padding: '10px' }}>
            <h3>Mesa {mesa.numero}</h3>
            <p>{mesa.capacidad} personas</p>
            <p>{mesa.estado}</p>

            <button onClick={() => setMesaSeleccionada(mesa)}>
              Reservar
            </button>

            <button onClick={() => eliminar(mesa.id)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {mesaSeleccionada && (
        <ReservaForm
          mesa={mesaSeleccionada}
          onClose={() => setMesaSeleccionada(null)}
        />
      )}
    </div>
  )
}

export default MesasList