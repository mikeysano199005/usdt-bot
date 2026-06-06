// Single source of truth for the coins accepted in the Sell flow.
// Reused by the flow logic and the Discord select-menu builders.

export interface SellCoin {
  code: string;        // e.g. 'USDT'
  label: string;       // shown in the select menu
  emoji: string;
  networks: string[];  // on-chain networks the seller may send from
  rateKey: string;     // settings key holding the fixed INR-per-coin payout rate
}

export const SELL_COINS: Record<string, SellCoin> = {
  USDT: { code: 'USDT', label: 'USDT (Tether)',   emoji: '💵', networks: ['BEP20', 'TRC20'], rateKey: 'sell_rate_usdt' },
  BTC:  { code: 'BTC',  label: 'BTC (Bitcoin)',   emoji: '🟠', networks: ['BTC'],            rateKey: 'sell_rate_btc'  },
  LTC:  { code: 'LTC',  label: 'LTC (Litecoin)',  emoji: '⚪', networks: ['LTC'],            rateKey: 'sell_rate_ltc'  },
  ETH:  { code: 'ETH',  label: 'ETH (Ethereum)',  emoji: '🔷', networks: ['ERC20'],          rateKey: 'sell_rate_eth'  },
};

export const SELL_COIN_CODES = Object.keys(SELL_COINS);

export function getSellCoin(code: string): SellCoin | undefined {
  return SELL_COINS[code.toUpperCase()];
}

// Settings key holding our receiving address for a given on-chain network,
// matching the existing `our_wallet_<network>` convention (migration 007).
export function walletSettingKey(network: string): string {
  return `our_wallet_${network.toLowerCase()}`;
}
