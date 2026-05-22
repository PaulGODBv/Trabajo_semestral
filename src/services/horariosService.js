import { supabase } from './supabaseClient'

export const getHorarios = async () => {
  const { data, error } = await supabase
    .from('horarios')
    .select('*')
    .order('dia_semana')
    .order('hora_inicio')
  return { data, error }
}

export const getHorariosActivosPorDia = async (diaSemana) => {
  const { data, error } = await supabase
    .from('horarios')
    .select('*')
    .eq('dia_semana', diaSemana)
    .eq('activo', true)
    .order('hora_inicio')
  return { data, error }
}

export const guardarHorario = async ({ id, dia_semana, hora_inicio, hora_fin, activo }) => {
  if (id) {
    const { data, error } = await supabase
      .from('horarios')
      .update({ hora_inicio, hora_fin, activo })
      .eq('id', id)
      .select()
    return { data, error }
  }
  const { data, error } = await supabase
    .from('horarios')
    .insert([{ dia_semana, hora_inicio, hora_fin, activo }])
    .select()
  return { data, error }
}

export const eliminarHorario = async (id) => {
  const { data, error } = await supabase
    .from('horarios')
    .delete()
    .eq('id', id)
    .select()
  return { data, error }
}
