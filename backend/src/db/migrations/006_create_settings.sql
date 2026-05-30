CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('exchange_rate', '88.50'),
  ('upi_id', 'merchant@upi'),
  ('bank_account_name', 'Your Business Name'),
  ('bank_account_number', '000000000000'),
  ('bank_ifsc', 'SBIN0000000'),
  ('bank_name', 'State Bank of India'),
  ('support_contact', '@yourusername'),
  ('support_response_hours', '2')
ON CONFLICT (key) DO NOTHING;
