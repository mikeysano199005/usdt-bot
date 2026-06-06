export type OrderStatus =
  | 'pending_payment'
  | 'payment_submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'usdt_sent'
  | 'completed';

// On-chain networks plus 'BINANCE_PAY' for off-chain Binance Pay sends.
export type CryptoNetwork = 'TRC20' | 'BEP20' | 'ERC20' | 'BTC' | 'LTC' | 'BINANCE_PAY';

export interface Order {
  id: number;
  order_ref: string;
  user_id: number;
  coin: string;
  inr_amount: string;
  usdt_amount: string;
  exchange_rate: string;
  network: string;
  wallet_address: string;
  status: OrderStatus;
  direction: 'buy' | 'sell';
  utr_number: string | null;
  tx_hash: string | null;
  admin_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentProof {
  id: number;
  order_id: number;
  file_path: string;
  telegram_file_id: string | null;
  uploaded_at: Date;
}

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['payment_submitted'],
  payment_submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['usdt_sent'],
  rejected: [],
  usdt_sent: ['completed'],
  completed: [],
};
