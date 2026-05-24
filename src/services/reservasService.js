import { supabase } from './supabaseClient'

const ESTADOS_ACTIVOS = ['activa']

export const getReservas = async () => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, mesas(numero, ubicacion)')
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })
  return { data, error }
}

export const getReservasFuturasActivasPorMesa = async (mesaId) => {
  const hoy = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('mesa_id', mesaId)
    .in('estado', ESTADOS_ACTIVOS)
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
  return { data, error }
}

export const createReserva = async (reserva) => {
  const { data, error } = await supabase
    .from('reservas')
    .insert([reserva])
    .select()
  return { data, error }
}

export const reservarMesaAtomico = async (mesaId, fecha, hora, clienteNombre, clienteTel, clienteEmail, numPersonas) => {
  const { data, error } = await supabase.rpc('reservar_mesa', {
    p_mesa_id: mesaId,
    p_fecha: fecha,
    p_hora: hora,
    p_cliente_nombre: clienteNombre,
    p_cliente_tel: clienteTel,
    p_cliente_email: clienteEmail,
    p_num_personas: numPersonas
  })

  if (error) return { data: null, error }

  const result = Array.isArray(data) ? data[0] : data

  if (result?.error === 'conflicto') {
    return { data: null, error: { code: 'CONFLICT', message: result.mensaje } }
  }

  return { data: result, error: null }
}

export const updateReserva = async (id, updates) => {
  const { data, error } = await supabase
    .from('reservas')
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}

export const cancelarReserva = async (id) => {
  const { data, error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', id)
    .select()
  return { data, error }
}

export const reactivarReserva = async (id, mesaId) => {
  const { data, error } = await supabase
    .from('reservas')
    .update({ estado: 'activa', mesa_id: mesaId })
    .eq('id', id)
    .select()
  return { data, error }
}

export const verificarDisponibilidad = async (mesaId, fecha, hora) => {
  const { data, error } = await supabase
    .from('reservas')
    .select('id')
    .eq('mesa_id', mesaId)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .in('estado', ESTADOS_ACTIVOS)
  if (error) return { disponible: false, error }
  return { disponible: data.length === 0, error: null }
}
