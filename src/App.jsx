import { useState } from 'react'
import MesasList from './components/MesasList'
import MesaForm from './components/MesaForm'

function App() {

  const [refresh, setRefresh] = useState(false)

  const recargar = () => {
    setRefresh(!refresh)
  }

  return (
    <div>
      <h1>The Gordo</h1>

      <MesaForm onCreated={recargar} />
      <MesasList key={refresh} />
    </div>
  )
}

export default App