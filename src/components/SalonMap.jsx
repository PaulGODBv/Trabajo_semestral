import { useMemo, useState } from 'react'
import { Lock } from 'lucide-react'

const ZONAS_SALON = [
  { nombre: 'Zona interior', descripcion: 'Área principal del restaurante', detalle: 'Ideal para grupos pequeños.' },
  { nombre: 'Zona terraza', descripcion: 'Espacio exterior', detalle: 'Ambiente abierto y fresco.' },
  { nombre: 'Zona ventana', descripcion: 'Mesas con vista', detalle: 'Vista exterior del salón.' }
]

function SalonMap({ mesas, loading, mesaSeleccionada , onSelectMesa }) {
  const [zonaActiva, setZonaActiva] = useState('Zona interior')
  const zonasPermitidas = ZONAS_SALON.map(z => z.nombre)

  const mesasOrdenadas = useMemo(() => [...mesas].sort((a,b) => Number(a.numero)-Number(b.numero)), [mesas])

  const getZona = (mesa) => zonasPermitidas.includes(mesa.ubicacion) ? mesa.ubicacion : 'Zona interior'

  const porZona = useMemo(() => ZONAS_SALON.reduce((acc, zona) => {
    const zm = mesasOrdenadas.filter(m => getZona(m) === zona.nombre)
    acc[zona.nombre] = {
      disponibles: zm.filter(m => m.estado === 'disponible').length,
      ocupadas: zm.filter(m => m.estado === 'ocupada').length,
      mesas: zm
    }
    return acc
  }, {}), [mesasOrdenadas])

  const zonaObj = ZONAS_SALON.find(z => z.nombre === zonaActiva) || ZONAS_SALON[0]
  const mesasActivas = porZona[zonaObj.nombre]?.mesas || []

  const getMesaClass = (mesa) => {
    const sel = mesaSeleccionada ?.id === mesa.id
    let est = 'table-button--available'
    if (mesa.estado === 'ocupada') est = 'table-button--occupied'
    if (mesa.estado === 'bloqueada') est = 'table-button--blocked'
    return ['table-button', est, sel ? 'table-button--selected' : ''].join(' ').trim()
  }

  const getZoneClass = () => {
    if (zonaActiva === 'Zona terraza') return 'salon-map__active-zone salon-map__active-zone--terrace'
    if (zonaActiva === 'Zona ventana') return 'salon-map__active-zone salon-map__active-zone--window'
    return 'salon-map__active-zone salon-map__active-zone--interior'
  }

  if (loading) return (
    <section className="salon-card">
      <div className="section-heading"><p className="eyebrow">Mapa del salón</p><h2>Cargando mesas...</h2></div>
      <div className="salon-loading" aria-label="Cargando mesas" role="status" />
    </section>
  )

  return (
    <section className="salon-card">
      <div className="section-heading">
        <p className="eyebrow">Mapa del salón</p>
        <h2> Selecciona una zona y una mesa</h2>
        <p> Elige la zona del restaurante y toca una mesa disponible para iniciar la reserva.</p>
      </div>

      <div className="legend" aria-label="Convenciones del mapa">
        <span><i className="legend-dot legend-dot--available" aria-hidden="true" /> Disponible</span>
        <span><i className="legend-dot legend-dot--occupied" aria-hidden="true" /> Ocupada </span>
        <span><i className="legend-dot legend-dot--blocked" aria-hidden="true" /> Bloqueada </span>
        <span><i className="legend-dot legend-dot--selected" aria-hidden="true" /> Seleccionada </span>
      </div>

      <div className="zone-selector" role="group" aria-label="Zonas del salón">
        {ZONAS_SALON.map(zona => {
          const s = porZona[zona.nombre] || { disponibles: 0, ocupadas: 0 }
          const active = zonaActiva === zona.nombre
          return (
            <button key={zona.nombre} type="button"
              className={active ? 'zone-selector__button zone-selector__button--active' : 'zone-selector__button'}
              onClick={() => setZonaActiva(zona.nombre)} aria-pressed={active}>
              <span className="zone-selector__name">{zona.nombre}</span>
              <span className="zone-selector__meta">{s.disponibles} libres · {s.ocupadas} ocupadas</span>
            </button>
          )
        })}
      </div>

      <div className="salon-map salon-map--single-zone" role="region" aria-label={`Plano de ${zonaActiva}`}>
        <section className={getZoneClass()}>
          <div className="active-zone-header">
            <div>
              <p className="eyebrow">Zona seleccionada</p>
              <h3>{zonaObj.nombre}</h3>
              <p>{zonaObj.descripcion}. {zonaObj.detalle}</p>
            </div>
            <div className="active-zone-stats">
              <strong>{mesasActivas.length}</strong>
              <span>{mesasActivas.length === 1 ? 'mesa' : 'mesas'}</span>
            </div>
          </div>

          <div className="active-zone-layout">
            {mesasActivas.length > 0 ? mesasActivas.map(mesa => {
              const disp = mesa.estado === 'disponible'
              const sel = mesaSeleccionada ?.id === mesa.id
              const etiqueta = mesa.estado === 'bloqueada' ? 'Bloqueada ' : mesa.estado === 'ocupada' ? 'Ocupada ' : zonaObj.nombre
              return (
                <button key={mesa.id} type="button" className={getMesaClass(mesa)}
                  onClick={() => disp && onSelectMesa(mesa)} disabled={!disp}
                  aria-pressed={sel}
                  aria-label={`Mesa ${mesa.numero}, ${mesa.capacidad} personas, ${etiqueta}`}>
                  <span className="table-button__number">{mesa.numero}</span>
                  <span className="table-button__capacity">{mesa.capacidad} pers.</span>
                  <span className="table-button__zone">
                    {mesa.estado === 'bloqueada'
                      ? <><Lock size={11} aria-hidden="true" /> Bloqueada </>
                      : zonaObj.nombre}
                  </span>
                </button>
              )
            }) : (
              <div className="zone-empty" role="status">No hay mesas en esta zona.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

export default SalonMap
