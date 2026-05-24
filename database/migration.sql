-- ============================================================
-- Migración: Prevención de condición de carrera en reservas
-- 
-- 1. Índice único parcial: evita dos reservas activas en la
--    misma mesa, fecha y hora a nivel de base de datos.
-- 2. Función RPC: operación atómica que verifica, inserta la
--    reserva y actualiza la mesa en una sola transacción.
-- ============================================================

-- 1. Índice único parcial
-- Impide insertar dos reservas con estado 'activa' para la
-- misma combinación de mesa, fecha y hora.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservas_mesa_fecha_hora_activa
ON reservas (mesa_id, fecha, hora)
WHERE estado = 'activa';

-- 2. Función RPC para reserva atómica
-- Se ejecuta como transacción única: verifica disponibilidad,
-- inserta la reserva y actualiza el estado de la mesa.
-- Si hay conflicto (mesa ya reservada), devuelve un error
-- controlado en lugar de lanzar excepción.
CREATE OR REPLACE FUNCTION reservar_mesa(
  p_mesa_id INT,
  p_fecha DATE,
  p_hora TIME,
  p_cliente_nombre TEXT,
  p_cliente_tel TEXT,
  p_cliente_email TEXT,
  p_num_personas INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reserva JSONB;
BEGIN
  -- El unique index parcial idx_reservas_mesa_fecha_hora_activa
  -- garantiza que solo una reserva activa exista por mesa/fecha/hora.
  -- En caso de concurrencia, el segundo INSERT lanzará
  -- unique_violation, capturado en el EXCEPTION.
  WITH inserted AS (
    INSERT INTO reservas (mesa_id, fecha, hora, cliente_nombre, cliente_tel, cliente_email, num_personas, estado)
    VALUES (p_mesa_id, p_fecha, p_hora, p_cliente_nombre, p_cliente_tel, p_cliente_email, p_num_personas, 'activa')
    RETURNING *
  )
  SELECT jsonb_agg(to_jsonb(inserted.*)) INTO v_reserva FROM inserted;

  -- Actualizar estado de la mesa a ocupada
  UPDATE mesas SET estado = 'ocupada' WHERE id = p_mesa_id;

  RETURN v_reserva;

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'error', 'conflicto',
      'mensaje', 'La mesa ya fue reservada para ese horario.'
    );
END;
$$;
