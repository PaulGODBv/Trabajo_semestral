import { useEffect } from 'react'
import { getMesas } from './services/mesasService'
import { getReservas, createReserva } from './services/reservasService'
import { getHorarios, createHorario } from './services/horariosService'

function App() {

  useEffect(() => {
    const test = async () => {

      // MESAS
      const mesas = await getMesas()
      console.log('MESAS:', mesas)

      // RESERVAS
      const reservas = await getReservas()
      console.log('RESERVAS:', reservas)

      // HORARIOS
      const horarios = await getHorarios()
      console.log('HORARIOS:', horarios)

    }

    test()
  }, [])

  return (
    <div>
      <h1>The Gordo</h1>
      <p>Verificar consola para conexión</p>
    </div>
  )
}

export default App