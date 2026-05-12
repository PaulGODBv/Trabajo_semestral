import { supabase } from './supabaseClient'

export const getMesas = async () => {
  const { data, error } = await supabase
    .from('mesas')
    .select('*')
    .order('numero', { ascending: true })

  return { data, error }
}

export const createMesa = async (mesa) => {
  const { data, error } = await supabase
    .from('mesas')
    .insert([mesa])
    .select()

  return { data, error }
}

export const updateMesa = async (id, updates) => {
  const { data, error } = await supabase
    .from('mesas')
    .update(updates)
    .eq('id', id)
    .select()

  return { data, error }
}

export const deleteMesa = async (id) => {
  const { data, error } = await supabase
    .from('mesas')
    .delete()
    .eq('id', id)
    .select()

  return { data, error }
}