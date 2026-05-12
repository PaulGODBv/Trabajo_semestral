import { useMemo, useState } from 'react'

const ZONAS_SALON = [
  {
    nombre: 'Zona interior',
    descripcion: 'Área principal del restaurante',
    detalle: 'Ideal para reservas familiares y grupos pequeños.'
  },
  {
    nombre: 'Zona terraza',
    descripcion: 'Espacio exterior',
    detalle: 'Ambiente abierto para quienes prefieren una zona más fresca.'
  },
  {
    nombre: 'Zona ventana',
    descripcion: 'Mesas con vista',
    detalle: 'Ubicación cercana a la vista exterior del salón.'
  }
]

function SalonMap({ mesas, loading, mesaSeleccionada, onSelectMesa }) {
  const [zonaActiva, setZonaActiva] = useState('Zona interior')

  const zonasPermitidas = ZONAS_SALON.map((zona) => zona.nombre)

  const mesasOrdenadas = useMemo(() => {
    return [...mesas].sort((a, b) => Number(a.numero) - Number(b.numero))
  }, [mesas])

  const getZonaMesa = (mesa) => {
    if (zonasPermitidas.includes(mesa.ubicacion)) {
      return mesa.ubicacion
    }

    return 'Zona interior'
  }

  const mesasPorZona = useMemo(() => {
    return ZONAS_SALON.reduce((acc, zona) => {
      const mesasZona = mesasOrdenadas.filter((mesa) => getZonaMesa(mesa) === zona.nombre)

      acc[zona.nombre] = {
        total: mesasZona.length,
        disponibles: mesasZona.filter((mesa) => mesa.estado === 'disponible').length,
        ocupadas: mesasZona.filter((mesa) => mesa.estado === 'ocupada').length,
        mesas: mesasZona
      }

      return acc
    }, {})
  }, [mesasOrdenadas])

  const zonaSeleccionada = ZONAS_SALON.find((zona) => zona.nombre === zonaActiva) || ZONAS_SALON[0]
  const mesasZonaActiva = mesasPorZona[zonaSeleccionada.nombre]?.mesas || []

  const getMesaClassName = (mesa) => {
    const isSelected = mesaSeleccionada?.id === mesa.id
    const isDisponible = mesa.estado === 'disponible'

    return [
      'table-button',
      isDisponible ? 'table-button--available' : 'table-button--occupied',
      isSelected ? 'table-button--selected' : ''
    ].join(' ')
  }

  const getZoneClass = () => {
    if (zonaActiva === 'Zona terraza') return 'salon-map__active-zone salon-map__active-zone--terrace'
    if (zonaActiva === 'Zona ventana') return 'salon-map__active-zone salon-map__active-zone--window'
    return 'salon-map__active-zone salon-map__active-zone--interior'
  }

  if (loading) {
    return (
      <section className="salon-card">
        <div className="section-heading">
          <p className="eyebrow">Mapa del salón</p>
          <h2>Cargando mesas...</h2>
        </div>
        <div className="salon-loading" aria-label="Cargando mesas" />
      </section>
    )
  }

  return (
    <section className="salon-card">
      <div className="section-heading">
        <p className="eyebrow">Mapa del salón</p>
        <h2>Selecciona una zona y una mesa</h2>
        <p>
          Primero elige la zona del restaurante y luego toca una mesa disponible para iniciar la reserva.
        </p>
      </div>

      <div className="legend" aria-label="Convenciones del mapa">
        <span><i className="legend-dot legend-dot--available" /> Disponible</span>
        <span><i className="legend-dot legend-dot--occupied" /> Ocupada</span>
        <span><i className="legend-dot legend-dot--selected" /> Seleccionada</span>
      </div>

      <div className="zone-selector" aria-label="Seleccionar zona del salón">
            {ZONAS_SALON.map((zona) => {
            const stats = mesasPorZona[zona.nombre] || { total: 0, disponibles: 0, ocupadas: 0 }
            const isActive = zonaActiva === zona.nombre

            return (
                <button
                key={zona.nombre}
                type="button"
                className={isActive ? 'zone-selector__button zone-selector__button--active' : 'zone-selector__button'}
                onClick={() => setZonaActiva(zona.nombre)}
                aria-pressed={isActive}
                >
                <span className="zone-selector__name">{zona.nombre}</span>
                <span className="zone-selector__meta">
                    {stats.disponibles} libres · {stats.ocupadas} ocupadas
                </span>
                </button>
            )
            })}
        </div>

        <div className="salon-map salon-map--single-zone" role="region" aria-label={`Plano visual de ${zonaActiva}`}>
    <section className={getZoneClass()}>
        <div className="active-zone-header">
        <div>
            <p className="eyebrow">Zona seleccionada</p>
            <h3>{zonaSeleccionada.nombre}</h3>
            <p>{zonaSeleccionada.descripcion}. {zonaSeleccionada.detalle}</p>
        </div>

        <div className="active-zone-stats">
            <strong>{mesasZonaActiva.length}</strong>
            <span>{mesasZonaActiva.length === 1 ? 'mesa' : 'mesas'}</span>
        </div>
        </div>

        <div className="active-zone-layout">
        {mesasZonaActiva.length > 0 ? (
            mesasZonaActiva.map((mesa) => {
            const disponible = mesa.estado === 'disponible'
            const selected = mesaSeleccionada?.id === mesa.id

            return (
                <button
                key={mesa.id}
                type="button"
                className={getMesaClassName(mesa)}
                onClick={() => disponible && onSelectMesa(mesa)}
                disabled={!disponible}
                aria-pressed={selected}
                aria-label={`Mesa ${mesa.numero}, ${mesa.capacidad} personas, ${mesa.estado}, ${zonaSeleccionada.nombre}`}
                >
                <span className="table-button__number">{mesa.numero}</span>
                <span className="table-button__capacity">{mesa.capacidad} pers.</span>
                <span className="table-button__zone">{zonaSeleccionada.nombre}</span>
                </button>
            )
            })
        ) : (
            <div className="zone-empty">
            No hay mesas registradas en esta zona.
            </div>
        )}
        </div>
    </section>
    </div>
    </section>
  )
}

export default SalonMap