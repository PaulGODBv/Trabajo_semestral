import { supabase } from './supabaseClient'

export const getHorarios = async () => {
  const { data, error } = await supabase
    .from('horarios')
    .select('*')

  return { data, error }
}

export const createHorario = async (horario) => {
  const { data, error } = await supabase
    .from('horarios')
    .insert([horario])

  return { data, error }
}