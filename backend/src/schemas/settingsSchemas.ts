import { z } from 'zod';

export const UpdateSettingsSchema = z.object({
  exchange_rate: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid number').optional(),
  upi_id: z.string().max(100).optional(),
  bank_account_name: z.string().max(100).optional(),
  bank_account_number: z.string().max(30).optional(),
  bank_ifsc: z.string().max(20).optional(),
  bank_name: z.string().max(100).optional(),
  support_contact: z.string().max(100).optional(),
  support_response_hours: z.string().regex(/^\d+$/).optional(),
  our_wallet_trc20: z.string().max(255).optional(),
  our_wallet_bep20: z.string().max(255).optional(),
  our_wallet_erc20: z.string().max(255).optional(),
  our_wallet_btc: z.string().max(255).optional(),
  our_wallet_ltc: z.string().max(255).optional(),
  binance_pay_id: z.string().max(100).optional(),
  sell_rate_usdt: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid number').optional(),
  sell_rate_btc: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid number').optional(),
  sell_rate_ltc: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid number').optional(),
  sell_rate_eth: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid number').optional(),
  rate_markup_percent: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid percentage').optional(),
});
