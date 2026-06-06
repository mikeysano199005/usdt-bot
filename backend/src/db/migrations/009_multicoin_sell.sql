-- Multi-coin sell support: sellers can hand over USDT/BTC/LTC/ETH via on-chain
-- address or Binance Pay. The network column was a fixed ENUM (TRC20/BEP20/ERC20);
-- convert it to free text so it can also hold BTC, LTC and BINANCE_PAY.
ALTER TABLE orders ALTER COLUMN network TYPE VARCHAR(20) USING network::text;

-- Which coin the order is for (buy orders remain USDT).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coin VARCHAR(10) NOT NULL DEFAULT 'USDT';

-- Admin-set fixed INR payout rate per coin (INR per 1 coin), Binance Pay ID,
-- and on-chain receiving addresses for the new coins. BEP20/TRC20/ERC20 wallets
-- already exist from migration 007.
INSERT INTO settings (key, value) VALUES
  ('sell_rate_usdt', '85.00'),
  ('sell_rate_btc', '0'),
  ('sell_rate_ltc', '0'),
  ('sell_rate_eth', '0'),
  ('binance_pay_id', ''),
  ('our_wallet_btc', ''),
  ('our_wallet_ltc', '')
ON CONFLICT (key) DO NOTHING;
