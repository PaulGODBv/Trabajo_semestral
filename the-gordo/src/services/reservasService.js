import { supabase } from './supabaseClient'

export const getReservas = async () => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')

  return { data, error }
}

export const createReserva = async (reserva) => {
  const { data, error } = await supabase
    .from('reservas')
    .insert([reserva])

  return { data, error }
}

export const cancelarReserva = async (id) => {
  const { data, error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', id)

  return { data, error }
}