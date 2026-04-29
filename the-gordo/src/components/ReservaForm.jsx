import { useState } from 'react'
import { createReserva } from '../services/reservasService'
import { updateMesa } from '../services/mesasService'

function ReservaForm({ mesa, onClose }) {

  const [form, setForm] = useState({
    cliente_nombre: '',
    cliente_tel: '',
    cliente_email: '',
    fecha: '',
    hora: '',
    num_personas: ''
  })

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
  e.preventDefault()

  const confirmar = window.confirm('¿Confirmar reserva?')
  if (!confirmar) return

  const { error } = await createReserva({
    mesa_id: mesa.id,
    cliente_nombre: form.cliente_nombre,
    cliente_tel: form.cliente_tel,
    cliente_email: form.cliente_email,
    fecha: form.fecha,
    hora: form.hora,
    num_personas: Number(form.num_personas),
    estado: 'activa'
  })

  if (error) {
    console.log(error)
    alert('Error al reservar')
    return
  }

  await updateMesa(mesa.id, { estado: 'ocupada' })

  alert('Reserva creada')

  onClose()
}

  return (
    <div style={{ border: '1px solid black', padding: '10px', marginTop: '10px' }}>
      <h3>Reservar Mesa {mesa.numero}</h3>

      <form onSubmit={handleSubmit}>
        <input name="cliente_nombre" placeholder="Nombre" onChange={handleChange} />
        <input name="cliente_tel" placeholder="Teléfono" onChange={handleChange} />
        <input name="cliente_email" placeholder="Email" onChange={handleChange} />
        <input type="date" name="fecha" onChange={handleChange} />
        <input type="time" name="hora" onChange={handleChange} />
        <input name="num_personas" placeholder="Personas" onChange={handleChange} />

        <button type="submit">Confirmar</button>
        <button type="button" onClick={onClose}>Cancelar</button>
      </form>
    </div>
  )
}

export default ReservaForm