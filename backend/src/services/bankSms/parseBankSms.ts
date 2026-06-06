/**
 * Parses a forwarded bank-alert SMS (as plain text) into structured data.
 *
 * Target bank: THE BANGALORE CITY CO OPERATIVE BANK LTD (senders AX/AD-TBCCBK-S).
 * Real sample (debit; credit is identical with "Credited"):
 *
 *   Your A/c XXXX0227 has been Debited with INR 369.00 on a/c of fund TRF
 *   on 05-06-2026 Your Current Balance is INR 2002.05 CR
 *   THE BANGALORE CITY CO OPERATIVE BANK LTD
 *
 * This bank's SMS contains NO UTR / transaction reference, so the only reliable
 * identifier for matching a payment is the exact amount (incl. paise).
 */
export interface ParsedBankSms {
  direction: 'credit' | 'debit';
  amount: number;
  balance: number | null;
}

const DIRECTION_RE = /has been\s+(credited|debited)\s+with\s+INR/i;
const AMOUNT_RE = /(?:credited|debited)\s+with\s+INR\s+([\d,]+\.\d{2})/i;
const BALANCE_RE = /Current\s+Balance\s+is\s+INR\s+([\d,]+\.\d{2})/i;

function toNumber(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

export function parseBankSms(text: string): ParsedBankSms | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, ' ').trim();

  const dirMatch = DIRECTION_RE.exec(normalized);
  const amtMatch = AMOUNT_RE.exec(normalized);
  if (!dirMatch || !amtMatch) return null;

  const amount = toNumber(amtMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const balMatch = BALANCE_RE.exec(normalized);

  return {
    direction: dirMatch[1].toLowerCase() === 'credited' ? 'credit' : 'debit',
    amount,
    balance: balMatch ? toNumber(balMatch[1]) : null,
  };
}

/**
 * True if the message text appears to come from one of the configured bank
 * sender IDs (the forwarder prefixes the body with "From : <SENDER>").
 * Lenient: if no senders are configured, accept anything that parsed.
 */
export function matchesSender(text: string, senders: string[]): boolean {
  if (senders.length === 0) return true;
  const upper = text.toUpperCase();
  return senders.some((s) => s.trim() && upper.includes(s.trim().toUpperCase()));
}

/**
 * Parses a UPI app's "you received money" notification (Google Pay / PhonePe /
 * Paytm), forwarded by MacroDroid. Used when the bank itself sends no credit SMS.
 *
 * Handles wordings like:
 *   "You received ₹500.37 from John Doe"
 *   "₹500.37 received from John"
 *   "You've received Rs.500.37 in your account"
 *
 * Requires paise (\.\d{1,2}) because every order is given a unique paise amount;
 * this also avoids matching stray round numbers in the notification text.
 */
const UPI_OUTGOING_RE = /(you paid|paid to|sent to|you sent|money sent|debited)/i;
const UPI_PATTERNS: RegExp[] = [
  /(?:received|credited)\b[^0-9]*?(?:₹|rs\.?|inr)?\s*([\d,]+\.\d{1,2})/i,
  /(?:₹|rs\.?|inr)\s*([\d,]+\.\d{1,2})\s*(?:has been\s*)?(?:received|credited)/i,
  /(?:₹|rs\.?|inr)\s*([\d,]+\.\d{1,2})/i,
];

export function parseUpiNotification(text: string): ParsedBankSms | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, ' ').trim();

  // Must look like an incoming payment, and not an outgoing one.
  if (!/(received|credited)/i.test(t)) return null;
  if (UPI_OUTGOING_RE.test(t)) return null;

  for (const re of UPI_PATTERNS) {
    const m = re.exec(t);
    if (m) {
      const amount = toNumber(m[1]);
      if (Number.isFinite(amount) && amount > 0) {
        return { direction: 'credit', amount, balance: null };
      }
    }
  }
  return null;
}

/** Tries the bank-SMS template first, then a UPI app notification. */
export function parsePaymentText(text: string): ParsedBankSms | null {
  return parseBankSms(text) ?? parseUpiNotification(text);
}
