import { useState } from 'react'
import { createMesa } from '../services/mesasService'

function MesaForm({ onCreated }) {

  const [form, setForm] = useState({
    numero: '',
    capacidad: '',
    ubicacion: '',
    estado: 'disponible'
  })

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // confirmación
    const confirmar = window.confirm('¿Deseas crear esta mesa?')
    if (!confirmar) return

    const { error } = await createMesa({
      numero: Number(form.numero),
      capacidad: Number(form.capacidad),
      ubicacion: form.ubicacion,
      estado: form.estado
    })

    if (error) {
      console.log(error)
      alert('Error al crear la mesa')
      return
    }

    alert('Mesa creada correctamente')

    setForm({
      numero: '',
      capacidad: '',
      ubicacion: '',
      estado: 'disponible'
    })

    if (onCreated) onCreated()
  }

  return (
    <div>
      <h2>Crear Mesa</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="numero"
          value={form.numero}
          placeholder="Número"
          onChange={handleChange}
          required
        />

        <input
          name="capacidad"
          value={form.capacidad}
          placeholder="Capacidad"
          onChange={handleChange}
          required
        />

        <input
          name="ubicacion"
          value={form.ubicacion}
          placeholder="Ubicación"
          onChange={handleChange}
          required
        />

        <select
          name="estado"
          value={form.estado}
          onChange={handleChange}
        >
          <option value="disponible">Disponible</option>
          <option value="ocupada">Ocupada</option>
        </select>

        <button type="submit">Crear</button>
      </form>
    </div>
  )
}

export default MesaForm