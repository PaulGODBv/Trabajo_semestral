export default function ReservaConfirmada({ reserva, onVolver }) {
  return (
    <section className="reserva-confirmada" aria-live="polite" aria-label="Reserva confirmada">
      <div className="reserva-confirmada__icon" aria-hidden="true">🦕</div>

      <div className="reserva-confirmada__content">
        <p className="eyebrow">¡Reserva exitosa!</p>
        <h2>Su reserva ha sido confirmada</h2>
        <p className="reserva-confirmada__subtitle">
          Te esperamos en el restaurante. Aquí están los detalles de tu reserva.
        </p>
      </div>

      <div className="reserva-confirmada__stone">
        <ul className="reservation-modal__list">
          <li>
            <span>Mesa</span>
            <strong>Mesa {reserva.mesa_numero}</strong>
          </li>
          <li>
            <span>Cliente</span>
            <strong>{reserva.cliente_nombre}</strong>
          </li>
          <li>
            <span>Teléfono</span>
            <strong>{reserva.cliente_tel}</strong>
          </li>
          <li>
            <span>Correo</span>
            <strong>{reserva.cliente_email}</strong>
          </li>
          <li>
            <span>Fecha</span>
            <strong>{reserva.fecha}</strong>
          </li>
          <li>
            <span>Hora</span>
            <strong>{reserva.hora}</strong>
          </li>
          <li>
            <span>Personas</span>
            <strong>{reserva.num_personas}</strong>
          </li>
        </ul>
      </div>

      <button
        type="button"
        className="button button--primary reserva-confirmada__btn"
        onClick={onVolver}
      >
        🏠 Volver al salón
      </button>
    </section>
  )
}
