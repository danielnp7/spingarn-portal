-- ============================================================
-- MIGRACIÓN: consultation_messages + fixes en consultations
-- Ejecutar en Supabase SQL Editor (es idempotente — safe to re-run)
-- ============================================================

-- ── 1. Corregir check constraint de area en consultations ────────────────────
--    El constraint original usaba valores viejos. Lo reemplazamos.
ALTER TABLE consultations
  DROP CONSTRAINT IF EXISTS consultations_area_check;

ALTER TABLE consultations
  ADD CONSTRAINT consultations_area_check CHECK (area IN (
    'aviacion', 'contratacion_publica', 'laboral', 'ma_energia',
    'propiedad_intelectual', 'datos_personales', 'tax_finance', 'tecnologia',
    -- legacy (por si hay registros viejos)
    'legal', 'tributaria', 'financiera', 'ma', 'cumplimiento', 'estrategia', 'otro'
  ));

-- ── 2. Columnas faltantes en consultations ───────────────────────────────────
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS sub_area_id  UUID,
  ADD COLUMN IF NOT EXISTS attachments  JSONB DEFAULT '[]';

-- ── 3. Tabla consultation_messages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultation_messages (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id     UUID        NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  sender_type         TEXT        NOT NULL CHECK (sender_type IN ('hub', 'client')),
  sender_name         TEXT,
  content             TEXT,
  files               JSONB       NOT NULL DEFAULT '[]',
  read_by_hub_at      TIMESTAMPTZ,
  read_by_client_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_consultation_id
  ON consultation_messages(consultation_id);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_created_at
  ON consultation_messages(consultation_id, created_at);

-- ── 4. RLS para consultation_messages ───────────────────────────────────────
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;

-- Clientes ven/escriben solo mensajes de sus propias consultas
CREATE POLICY IF NOT EXISTS "clients_own_messages"
  ON consultation_messages FOR ALL
  USING (
    consultation_id IN (
      SELECT id FROM consultations
      WHERE client_id IN (
        SELECT client_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ── 5. Índice adicional en consultations.sub_area_id ────────────────────────
CREATE INDEX IF NOT EXISTS idx_consultations_sub_area_id
  ON consultations(sub_area_id) WHERE sub_area_id IS NOT NULL;
