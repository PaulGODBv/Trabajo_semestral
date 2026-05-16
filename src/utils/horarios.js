const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

export const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

export const NOMBRES_DIAS = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo'
}

export function getDiaSemana(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return DIAS[date.getDay()]
}

export function normalizarHora(t) {
  if (!t) return ''
  return t.slice(0, 5) // '19:00:00' → '19:00'
}

export function generarSlots(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return []
  const slots = []
  const toMin = (t) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }
  let cur = toMin(horaInicio)
  const end = toMin(horaFin)
  while (cur < end) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    cur += 60
  }
  return slots
}
