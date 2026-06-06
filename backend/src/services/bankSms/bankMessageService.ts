import { query } from '../../db/pool';

export async function bankMessageExists(emailUid: string): Promise<boolean> {
  const { rows } = await query(
    'SELECT 1 FROM bank_messages WHERE email_uid = $1 LIMIT 1',
    [emailUid]
  );
  return rows.length > 0;
}

/**
 * Inserts a parsed bank SMS. The UNIQUE(email_uid) constraint plus
 * ON CONFLICT DO NOTHING guarantees the same forwarded email is never
 * counted twice. Returns the new row id, or 0 if it was a duplicate.
 */
export async function insertBankMessage(data: {
  emailUid: string;
  direction: 'credit' | 'debit';
  amount: number;
  balance: number | null;
  rawText: string;
  matchedOrderId?: number | null;
}): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO bank_messages
       (email_uid, direction, amount, balance, raw_text, matched_order_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email_uid) DO NOTHING
     RETURNING id`,
    [
      data.emailUid,
      data.direction,
      data.amount.toFixed(2),
      data.balance != null ? data.balance.toFixed(2) : null,
      data.rawText,
      data.matchedOrderId ?? null,
    ]
  );
  return rows[0]?.id ?? 0;
}
