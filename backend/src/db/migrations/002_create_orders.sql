DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending_payment',
    'payment_submitted',
    'under_review',
    'approved',
    'rejected',
    'usdt_sent',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crypto_network AS ENUM ('TRC20', 'BEP20', 'ERC20');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_ref VARCHAR(25) UNIQUE NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id),
  inr_amount NUMERIC(14,2) NOT NULL,
  usdt_amount NUMERIC(14,6) NOT NULL,
  exchange_rate NUMERIC(10,4) NOT NULL,
  network crypto_network NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  status order_status DEFAULT 'pending_payment',
  utr_number VARCHAR(100),
  tx_hash VARCHAR(255),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
