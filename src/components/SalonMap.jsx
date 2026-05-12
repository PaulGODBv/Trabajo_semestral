function SalonMap({ mesas, loading, mesaSeleccionada, onSelectMesa }) {
  const mesasOrdenadas = [...mesas].sort((a, b) => Number(a.numero) - Number(b.numero))

  const getMesaClassName = (mesa) => {
    const isSelected = mesaSeleccionada?.id === mesa.id
    const isDisponible = mesa.estado === 'disponible'

    return [
      'table-button',
      isDisponible ? 'table-button--available' : 'table-button--occupied',
      isSelected ? 'table-button--selected' : ''
    ].join(' ')
  }

  const getZonaMesa = (index) => {
    if (index < 4) return 'Zona roca'
    if (index < 8) return 'Centro'
    return 'Terraza'
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
        <h2>Selecciona una mesa</h2>
        <p>
          Toca una mesa disponible para iniciar la reserva. Las mesas ocupadas se muestran bloqueadas.
        </p>
      </div>

      <div className="legend" aria-label="Convenciones del mapa">
        <span><i className="legend-dot legend-dot--available" /> Disponible</span>
        <span><i className="legend-dot legend-dot--occupied" /> Ocupada</span>
        <span><i className="legend-dot legend-dot--selected" /> Seleccionada</span>
      </div>

      <div className="salon-map" role="region" aria-label="Plano visual del salón del restaurante">
        <div className="salon-map__entrance">Entrada</div>
        <div className="salon-map__bar">Barra</div>
        <div className="salon-map__kitchen">Cocina</div>

        <div className="tables-grid">
          {mesasOrdenadas.length > 0 ? (
            mesasOrdenadas.map((mesa, index) => {
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
                  aria-label={`Mesa ${mesa.numero}, ${mesa.capacidad} personas, ${mesa.estado}`}
                >
                  <span className="table-button__number">{mesa.numero}</span>
                  <span className="table-button__capacity">{mesa.capacidad} pers.</span>
                  <span className="table-button__zone">{mesa.ubicacion || getZonaMesa(index)}</span>
                </button>
              )
            })
          ) : (
            <div className="no-tables">
              <h3>No hay mesas registradas</h3>
              <p>Agrega mesas en Supabase para que aparezcan en el plano del salón.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default SalonMap