-- ============================================================
-- BASE DE CONOCIMIENTO POR AGENTE DEL CONSEJO CONSULTIVO
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_knowledge (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id      TEXT        NOT NULL,           -- laboral, tributario, financiero, etc.
  type          TEXT        NOT NULL CHECK (type IN (
                              'norma_vigente',   -- ley, reglamento, resolución vigente
                              'jurisprudencia',  -- fallo, precedente, absolución SRI
                              'caso_tipo',       -- caso representativo con resolución
                              'criterio',        -- interpretación técnica de la firma
                              'alerta_cambio',   -- cambio reciente post entrenamiento IA
                              'otro'
                            )),
  title         TEXT        NOT NULL,
  content       TEXT        NOT NULL,
  source        TEXT,                            -- "Art. 25 LORTI", "SRI Circular 001-2025"
  effective_date DATE,                           -- desde cuándo aplica
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  submitted_by  UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_id ON agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_active   ON agent_knowledge(agent_id, is_active);

ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Solo service role escribe (hub lo hace via API con service role key)
-- No se expone directamente al cliente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_knowledge' AND policyname = 'no_public_access'
  ) THEN
    CREATE POLICY "no_public_access"
      ON agent_knowledge FOR ALL
      USING (false);
  END IF;
END $$;
