import { supabase } from './supabaseClient'

export const getMesas = async () => {
  const { data, error } = await supabase
    .from('mesas')
    .select('*')

  return { data, error }
}