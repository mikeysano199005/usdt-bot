import { Router, Request, Response } from 'express';
import express from 'express';
import crypto from 'crypto';
import config from '../../config';
import { getSetting } from '../../services/settingsService';
import { ingestPaymentMessage } from '../../services/bankSms/ingest';

const router = Router();

// Accept a raw text/plain body (the notification text itself). JSON bodies are
// already parsed by the global express.json() middleware.
router.use(express.text({ type: 'text/*', limit: '64kb' }));

/**
 * MacroDroid (or any forwarder) POSTs a UPI "received money" notification here.
 *
 * Simplest setup — text/plain:
 *   Body:    the raw notification text
 *   Header:  x-webhook-secret: <PAYMENT_WEBHOOK_SECRET>
 *   Header:  x-msg-id: <unique id, e.g. MacroDroid [fire_time]>  (optional)
 *
 * Also accepts JSON: { "secret": "...", "text": "...", "id"?: "..." }
 */
router.post('/', async (req: Request, res: Response) => {
  const body = req.body;
  const isObject = body !== null && typeof body === 'object';

  const provided =
    req.header('x-webhook-secret') ?? (isObject ? body.secret : undefined);
  if (!config.webhook.secret || provided !== config.webhook.secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const enabled = (await getSetting('bank_sms_enabled')) ?? 'false';
  if (enabled !== 'true') return res.json({ ok: false, reason: 'disabled' });

  const text = (typeof body === 'string' ? body : isObject ? body.text ?? '' : '')
    .toString()
    .trim();
  if (!text) return res.status(400).json({ error: 'missing text' });

  const rawId = req.header('x-msg-id') ?? (isObject ? body.id : undefined);
  const uid =
    rawId != null && rawId !== ''
      ? `upi-${rawId}`
      : 'upi-' + crypto.createHash('sha1').update(text).digest('hex');

  const result = await ingestPaymentMessage({ uid, text, checkSender: false });
  return res.json(result);
});

export default router;
