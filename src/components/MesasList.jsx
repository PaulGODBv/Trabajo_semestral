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
    const confirmar = window.confirm('¿Eliminar mesa?')
    if (!confirmar) return

    await deleteMesa(id)
    cargarMesas()
  }

  const disponibles = mesas.filter(m => m.estado === 'disponible')
  const ocupadas = mesas.filter(m => m.estado === 'ocupada')

  return (
    <div>

      <h2>Disponibles</h2>
      <div style={styles.grid}>
        {disponibles.map((mesa) => (
          <div key={mesa.id} style={styles.card}>
            <h3>Mesa {mesa.numero}</h3>
            <p>{mesa.capacidad} personas</p>

            <button onClick={() => setMesaSeleccionada(mesa)}>
              Reservar
            </button>

            <button onClick={() => eliminar(mesa.id)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <h2>Ocupadas</h2>
      <div style={styles.grid}>
        {ocupadas.map((mesa) => (
          <div key={mesa.id} style={styles.card}>
            <h3>Mesa {mesa.numero}</h3>
            <p>{mesa.capacidad} personas</p>
            <p>Ocupada</p>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {mesaSeleccionada && (
        <Modal onClose={() => setMesaSeleccionada(null)}>
          <ReservaForm
            mesa={mesaSeleccionada}
            onClose={() => {
              setMesaSeleccionada(null)
              cargarMesas()
            }}
          />
        </Modal>
      )}

    </div>
  )
}

export default MesasList

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px'
  },
  card: {
    border: '1px solid #ccc',
    padding: '10px'
  }
}