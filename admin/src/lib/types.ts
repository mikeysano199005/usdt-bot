export type OrderStatus =
  | 'pending_payment'
  | 'payment_submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'usdt_sent'
  | 'completed';

export type CryptoNetwork = 'TRC20' | 'BEP20' | 'ERC20';

export interface Order {
  id: number;
  order_ref: string;
  user_id: number;
  inr_amount: string;
  usdt_amount: string;
  exchange_rate: string;
  network: CryptoNetwork;
  wallet_address: string;
  status: OrderStatus;
  direction: 'buy' | 'sell';
  utr_number: string | null;
  tx_hash: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  discord_id?: string;
  username?: string | null;
  display_name?: string | null;
  proof_file_path?: string | null;
}

export interface User {
  id: number;
  discord_id: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  pending_payment: number;
  payment_submitted: number;
  under_review: number;
  approved: number;
  rejected: number;
  usdt_sent: number;
  completed: number;
  total_inr_volume?: string;
  total_usdt_volume?: string;
}

export interface Settings {
  exchange_rate: string;
  upi_id: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  bank_name: string;
  support_contact: string;
  support_response_hours: string;
  our_wallet_trc20: string;
  our_wallet_bep20: string;
  our_wallet_erc20: string;
  rate_markup_percent: string;
}

export interface AdminInfo {
  id: number;
  username: string;
}
