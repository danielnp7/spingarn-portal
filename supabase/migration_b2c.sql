-- ============================================================
-- MIGRACIÓN B2C: Stripe + Suscripciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. stripe_customer_id en clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Tabla de suscripciones activas por cliente
CREATE TABLE IF NOT EXISTS client_subscriptions (
  id                       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                UUID        NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  plan_id                  TEXT        NOT NULL CHECK (plan_id IN ('starter', 'pyme', 'corporativo')),
  stripe_subscription_id   TEXT,
  status                   TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  credits_per_month        INT         NOT NULL DEFAULT 0,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at             TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client_id
  ON client_subscriptions(client_id);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_stripe_id
  ON client_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- 3. RLS para client_subscriptions
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_subscriptions' AND policyname = 'clients_own_subscriptions'
  ) THEN
    CREATE POLICY "clients_own_subscriptions"
      ON client_subscriptions FOR SELECT
      USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- 4. Tabla payment_requests (si no existe ya)
CREATE TABLE IF NOT EXISTS payment_requests (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL,
  consultation_id  UUID        REFERENCES consultations(id) ON DELETE SET NULL,
  type             TEXT        NOT NULL DEFAULT 'wallet_topup',
  credits          INT,
  amount_usd       NUMERIC(10,2),
  notes            TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected', 'cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_requests' AND policyname = 'clients_own_payment_requests'
  ) THEN
    CREATE POLICY "clients_own_payment_requests"
      ON payment_requests FOR ALL
      USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Add consultation_id column if migration was already partially applied
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL;
