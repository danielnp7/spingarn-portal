-- ============================================================
-- CONSEJO CONSULTIVO SPINGARN
-- ============================================================

CREATE TABLE IF NOT EXISTS council_sessions (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL,
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  council_response TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS council_agent_responses (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   UUID        NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
  agent_id     TEXT        NOT NULL,
  agent_name   TEXT        NOT NULL,
  agent_area   TEXT        NOT NULL,
  response     TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_council_sessions_client ON council_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_council_agent_responses_session ON council_agent_responses(session_id);

-- RLS
ALTER TABLE council_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_agent_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'council_sessions' AND policyname = 'clients_own_council_sessions'
  ) THEN
    CREATE POLICY "clients_own_council_sessions"
      ON council_sessions FOR ALL
      USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Las deliberaciones internas solo las lee el service role (partner1 las accede via API server-side)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'council_agent_responses' AND policyname = 'no_direct_client_access'
  ) THEN
    CREATE POLICY "no_direct_client_access"
      ON council_agent_responses FOR SELECT
      USING (false);
  END IF;
END $$;
