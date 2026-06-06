-- Stores bank-credit/debit SMS forwarded to email, parsed by the IMAP poller.
-- Used to auto-verify incoming UPI payments by matching the exact INR amount.
CREATE TABLE IF NOT EXISTS bank_messages (
  id BIGSERIAL PRIMARY KEY,
  email_uid VARCHAR(255) UNIQUE,            -- IMAP message-id, prevents double-counting
  direction VARCHAR(10) NOT NULL,           -- 'credit' | 'debit'
  amount NUMERIC(14,2) NOT NULL,
  balance NUMERIC(14,2),
  raw_text TEXT NOT NULL,
  matched_order_id BIGINT REFERENCES orders(id),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_messages_amount ON bank_messages(amount);
CREATE INDEX IF NOT EXISTS idx_bank_messages_direction ON bank_messages(direction);

-- Non-loginable system account that the automated matcher attributes actions to.
-- The password hash 'x' is not a valid bcrypt hash, so this user can never log in.
INSERT INTO admin_users (username, password_hash)
VALUES ('system', 'x')
ON CONFLICT (username) DO NOTHING;

-- Bank-SMS settings (editable later from the admin panel / settings table).
INSERT INTO settings (key, value) VALUES
  ('bank_sms_enabled', 'false'),
  ('bank_sms_senders', 'AX-TBCCBK-S,AD-TBCCBK-S')
ON CONFLICT (key) DO NOTHING;
