-- ============================================================
-- Migración: Prevención de condición de carrera en reservas
-- 
-- 1. Índice único parcial: evita dos reservas activas en la
--    misma mesa, fecha y hora a nivel de base de datos.
-- 2. Función RPC (opcional): operación atómica que inserta la
--    reserva y actualiza la mesa en una sola transacción.
-- ============================================================

-- 1. Índice único parcial (OBLIGATORIO)
-- Impide insertar dos reservas con estado 'activa' para la
-- misma combinación de mesa, fecha y hora.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservas_mesa_fecha_hora_activa
ON reservas (mesa_id, fecha, hora)
WHERE estado = 'activa';

-- 2. Función RPC para reserva atómica (RECOMENDADO)
-- Ejecuta la inserción y actualización de la mesa en una sola
-- transacción. El índice único parcial actúa como red de seguridad
-- ante concurrencia.
CREATE OR REPLACE FUNCTION reservar_mesa(
  p_mesa_id BIGINT,
  p_fecha DATE,
  p_hora TIME WITHOUT TIME ZONE,
  p_cliente_nombre TEXT,
  p_cliente_tel TEXT,
  p_cliente_email TEXT,
  p_num_personas INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO reservas (mesa_id, fecha, hora, cliente_nombre, cliente_tel, cliente_email, num_personas, estado)
    VALUES (p_mesa_id, p_fecha, p_hora, p_cliente_nombre, p_cliente_tel, p_cliente_email, p_num_personas, 'activa')
    RETURNING *
  )
  SELECT jsonb_agg(to_jsonb(inserted.*)) INTO v_reserva FROM inserted;

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
