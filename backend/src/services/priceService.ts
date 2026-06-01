import { getSetting } from './settingsService';

interface PriceCache {
  inr: number;
  fetchedAt: number;
}

let cache: PriceCache | null = null;
const CACHE_TTL = 60_000;

export async function getLiveUsdtInrRate(): Promise<number> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.inr;
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error('CoinGecko API error');
    const data = await res.json() as { tether: { inr: number } };
    const livePrice = data.tether.inr;
    cache = { inr: livePrice, fetchedAt: Date.now() };
    return livePrice;
  } catch {
    const fallback = await getSetting('exchange_rate');
    return parseFloat(fallback ?? '88.50');
  }
}

export async function getBuyRate(): Promise<{ rate: number; markup: number; display: string }> {
  const live = await getLiveUsdtInrRate();
  const markupPct = parseFloat((await getSetting('rate_markup_percent')) ?? '2');
  const rate = parseFloat((live * (1 + markupPct / 100)).toFixed(2));
  return { rate, markup: markupPct, display: `₹${rate.toFixed(2)}` };
}

export async function getSellRate(): Promise<{ rate: number; markup: number; display: string }> {
  const live = await getLiveUsdtInrRate();
  const markupPct = parseFloat((await getSetting('rate_markup_percent')) ?? '2');
  const rate = parseFloat((live * (1 - markupPct / 100)).toFixed(2));
  return { rate, markup: markupPct, display: `₹${rate.toFixed(2)}` };
}
