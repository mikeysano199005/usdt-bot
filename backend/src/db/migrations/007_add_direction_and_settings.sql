ALTER TABLE orders ADD COLUMN IF NOT EXISTS direction VARCHAR(10) DEFAULT 'buy' CHECK (direction IN ('buy', 'sell'));

INSERT INTO settings (key, value) VALUES
  ('rate_markup_percent', '2'),
  ('our_wallet_trc20', 'YOUR_TRC20_WALLET_ADDRESS'),
  ('our_wallet_bep20', 'YOUR_BEP20_WALLET_ADDRESS'),
  ('our_wallet_erc20', 'YOUR_ERC20_WALLET_ADDRESS'),
  ('shop_channel_id', '')
ON CONFLICT (key) DO NOTHING;
