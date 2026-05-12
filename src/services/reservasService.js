import { supabase } from './supabaseClient'

export const getReservas = async () => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .order('fecha', { ascending: false })

  return { data, error }
}

export const getReservasActivas = async () => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .in('estado', ['activa', 'confirmada'])
    .order('fecha', { ascending: false })

  return { data, error }
}

export const createReserva = async (reserva) => {
  const { data, error } = await supabase
    .from('reservas')
    .insert([reserva])
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