-- ============================================================
-- MÓDULO TRANSACCIONAL: CONSULTAS
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Consultas
CREATE TABLE IF NOT EXISTS consultations (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by_user_id   UUID NOT NULL,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  area                 TEXT NOT NULL CHECK (area IN ('legal','tributaria','financiera','ma','cumplimiento','estrategia','otro')),
  urgency              TEXT NOT NULL DEFAULT 'media' CHECK (urgency IN ('baja','media','alta','critica')),
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','classified','pending_client_approval',
    'approved','in_progress','internal_review','partner_review',
    'answered','closed','cancelled','requires_extra_approval'
  )),
  complexity           TEXT CHECK (complexity IN ('simple','media','compleja','cotizacion_manual','requiere_reunion','requiere_socio_senior')),
  -- AI classification
  estimated_fee        NUMERIC(10,2),
  estimated_hours      NUMERIC(6,2),
  estimated_credits    INT,
  estimated_sla_hours  INT,
  classification_note  TEXT,
  area_responsible     TEXT,
  priority             TEXT DEFAULT 'normal' CHECK (priority IN ('baja','normal','alta','urgente')),
  -- Approval
  approved_fee         NUMERIC(10,2),
  approved_credits     INT,
  -- Final (post-execution)
  final_fee            NUMERIC(10,2),
  final_hours          NUMERIC(6,2),
  final_credits        INT,
  -- Assignment
  assigned_to          UUID,
  -- Audit
  approved_by          UUID,
  approved_at          TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,
  closed_by            UUID,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adjuntos de consulta
CREATE TABLE IF NOT EXISTS consultation_attachments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id   UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  file_url          TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_size_bytes   BIGINT,
  uploaded_by       UUID NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Aprobaciones (audit trail de cada decisión del cliente)
CREATE TABLE IF NOT EXISTS consultation_approvals (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id       UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  approval_type         TEXT NOT NULL CHECK (approval_type IN ('credits','payment','quote_request','cancel','extra_approval')),
  amount_usd            NUMERIC(10,2),
  credits_used          INT,
  approved_by_user_id   UUID NOT NULL,
  approved_at           TIMESTAMPTZ DEFAULT NOW(),
  status                TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','rejected','pending')),
  notes                 TEXT
);

-- 4. Respuestas formales
CREATE TABLE IF NOT EXISTS consultation_responses (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id     UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','internal_review','partner_approved','sent')),
  executive_summary   TEXT,
  technical_analysis  TEXT,
  risks               TEXT,
  recommendation      TEXT,
  next_steps          TEXT,
  convert_to_project  BOOLEAN DEFAULT FALSE,
  sent_at             TIMESTAMPTZ,
  approved_by         UUID,
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Time entries por consulta
CREATE TABLE IF NOT EXISTS consultation_time_entries (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id   UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL,
  date              DATE NOT NULL,
  minutes           INT NOT NULL CHECK (minutes > 0),
  description       TEXT NOT NULL,
  billable          BOOLEAN DEFAULT TRUE,
  area              TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Wallet por cliente (1 crédito = credit_unit_usd)
CREATE TABLE IF NOT EXISTS client_wallet (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  balance_credits          INT NOT NULL DEFAULT 0,
  reserved_credits         INT NOT NULL DEFAULT 0,
  used_credits             INT NOT NULL DEFAULT 0,
  monthly_limit            INT,
  auto_recharge_enabled    BOOLEAN DEFAULT FALSE,
  credit_unit_usd          NUMERIC(6,2) NOT NULL DEFAULT 75.00,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Transacciones de wallet
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  consultation_id   UUID REFERENCES consultations(id),
  type              TEXT NOT NULL CHECK (type IN ('credit','debit','reserve','release','adjustment')),
  credits           INT NOT NULL,
  amount_usd        NUMERIC(10,2),
  description       TEXT NOT NULL,
  created_by        UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Productos del marketplace
CREATE TABLE IF NOT EXISTS service_products (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    TEXT NOT NULL,
  category                TEXT NOT NULL,
  description             TEXT,
  base_price_usd          NUMERIC(10,2),
  price_label             TEXT,
  estimated_delivery_days INT,
  required_documents      JSONB DEFAULT '[]',
  highlights              JSONB DEFAULT '[]',
  active                  BOOLEAN DEFAULT TRUE,
  sort_order              INT DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Órdenes del marketplace
CREATE TABLE IF NOT EXISTS service_orders (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES service_products(id),
  created_by_user_id   UUID NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','quoted','approved','in_progress','delivered','cancelled')),
  notes                TEXT,
  quoted_price         NUMERIC(10,2),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Indicadores de salud empresarial
CREATE TABLE IF NOT EXISTS health_indicators (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('liquidez','endeudamiento','margen','tributario','laboral','societario','vencimientos','documentacion')),
  indicator     TEXT NOT NULL,
  value         TEXT,
  risk_level    TEXT NOT NULL DEFAULT 'medio' CHECK (risk_level IN ('bajo','medio','alto','critico')),
  notes         TEXT,
  action_type   TEXT CHECK (action_type IN ('consulta','proyecto','informe','reunion','propuesta')),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_by    UUID
);

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consultations_client_id    ON consultations(client_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status       ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_assigned_to  ON consultations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_client_id        ON wallet_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_consult_time_entries       ON consultation_time_entries(consultation_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE consultations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_approvals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_responses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_time_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_wallet                ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_indicators            ENABLE ROW LEVEL SECURITY;

-- Clientes ven sólo sus datos
CREATE POLICY "clients_own_consultations" ON consultations FOR ALL
  USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "clients_own_attachments" ON consultation_attachments FOR ALL
  USING (consultation_id IN (SELECT id FROM consultations WHERE client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "clients_own_approvals" ON consultation_approvals FOR ALL
  USING (consultation_id IN (SELECT id FROM consultations WHERE client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "clients_own_responses" ON consultation_responses FOR SELECT
  USING (consultation_id IN (SELECT id FROM consultations WHERE client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "clients_own_wallet" ON client_wallet FOR SELECT
  USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "clients_own_wallet_tx" ON wallet_transactions FOR SELECT
  USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "clients_own_orders" ON service_orders FOR ALL
  USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "clients_own_health" ON health_indicators FOR SELECT
  USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));

-- Productos activos: todos los autenticados los pueden leer
CREATE POLICY "products_public_read" ON service_products FOR SELECT
  USING (active = TRUE);

-- Staff de Spingarn: acceso total (usa service role en API routes)
-- Las API routes del portal usan service role key para bypass RLS cuando es necesario
