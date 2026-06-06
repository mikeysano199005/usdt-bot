import { getSetting } from '../settingsService';
import { parsePaymentText, matchesSender } from './parseBankSms';
import { bankMessageExists, insertBankMessage } from './bankMessageService';
import { matchCreditToOrder, markOrderPaymentVerified } from '../orderService';
import { notifyOrderStatusChange, sendAdminBankAlert } from '../notificationService';

export type IngestReason =
  | 'verified'
  | 'duplicate'
  | 'unparsed'
  | 'wrong_sender'
  | 'debit'
  | 'no_match'
  | 'ambiguous';

export interface IngestResult {
  ok: boolean;
  reason: IngestReason;
  orderRef?: string;
  amount?: number;
}

/**
 * Single entry point for any incoming bank/UPI message (forwarded email OR
 * MacroDroid webhook). Dedupes, parses, and — for credits — matches the exact
 * amount to one pending order and advances it to 'under_review'. The actual
 * USDT release stays a manual admin action.
 */
export async function ingestPaymentMessage(opts: {
  uid: string;
  text: string;
  checkSender?: boolean;
}): Promise<IngestResult> {
  const { uid, text, checkSender = false } = opts;

  if (await bankMessageExists(uid)) {
    return { ok: false, reason: 'duplicate' };
  }

  if (checkSender) {
    const sendersCsv = (await getSetting('bank_sms_senders')) ?? '';
    const senders = sendersCsv.split(',').map((s) => s.trim()).filter(Boolean);
    if (!matchesSender(text, senders)) return { ok: false, reason: 'wrong_sender' };
  }

  const parsed = parsePaymentText(text);
  if (!parsed) return { ok: false, reason: 'unparsed' };

  // For credits, find the matching order before recording the message.
  let result = null as Awaited<ReturnType<typeof matchCreditToOrder>> | null;
  let matchedOrderId: number | null = null;
  if (parsed.direction === 'credit') {
    result = await matchCreditToOrder(parsed.amount);
    if (result.status === 'matched') matchedOrderId = result.order.id;
  }

  const bankMessageId = await insertBankMessage({
    emailUid: uid,
    direction: parsed.direction,
    amount: parsed.amount,
    balance: parsed.balance,
    rawText: text.slice(0, 4000),
    matchedOrderId,
  });
  if (bankMessageId === 0) return { ok: false, reason: 'duplicate' };

  const amountStr = parsed.amount.toFixed(2);

  if (parsed.direction !== 'credit' || !result) {
    return { ok: false, reason: 'debit', amount: parsed.amount };
  }

  if (result.status === 'matched') {
    const order = result.order;
    await markOrderPaymentVerified(
      order.id,
      `Auto-verified via bank/UPI message: ₹${amountStr} credited.`
    );
    await notifyOrderStatusChange(order.discord_id, order.order_ref, 'under_review');
    await sendAdminBankAlert(
      `💰 **Payment verified** for \`${order.order_ref}\` — ₹${amountStr} received. Ready to approve & release USDT.`
    );
    console.log(`[BankSMS] Matched ₹${amountStr} -> ${order.order_ref}`);
    return { ok: true, reason: 'verified', orderRef: order.order_ref, amount: parsed.amount };
  }

  if (result.status === 'ambiguous') {
    await sendAdminBankAlert(
      `⚠️ Credit of ₹${amountStr} matched **${result.count}** pending orders — resolve manually.`
    );
    return { ok: false, reason: 'ambiguous', amount: parsed.amount };
  }

  await sendAdminBankAlert(
    `ℹ️ Credit of ₹${amountStr} received but no matching pending order was found.`
  );
  return { ok: false, reason: 'no_match', amount: parsed.amount };
}
