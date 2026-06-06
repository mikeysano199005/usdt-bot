import { Readable } from 'stream';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import config from '../../config';
import { getSetting } from '../settingsService';
import { ingestPaymentMessage } from './ingest';

interface RawEmail {
  messageId: string;
  text: string;
}

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startImapPoller(): void {
  if (!config.imap.host || !config.imap.user || !config.imap.password) {
    console.log(
      '[BankSMS] IMAP not configured (IMAP_HOST/IMAP_USER/IMAP_PASSWORD) — poller disabled.'
    );
    return;
  }

  console.log(
    `[BankSMS] IMAP poller started (every ${config.imap.pollIntervalMs}ms)`
  );
  const tick = (): void => {
    pollOnce().catch((e) =>
      console.error('[BankSMS] poll error:', e?.message ?? e)
    );
  };
  timer = setInterval(tick, config.imap.pollIntervalMs);
  tick();
}

export function stopImapPoller(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

async function pollOnce(): Promise<void> {
  if (running) return; // never overlap two polls
  const enabled = (await getSetting('bank_sms_enabled')) ?? 'false';
  if (enabled !== 'true') return;

  running = true;
  try {
    const emails = await fetchUnseen();
    for (const email of emails) {
      try {
        await handleEmail(email);
      } catch (e) {
        console.error('[BankSMS] handle error:', (e as Error).message);
      }
    }
  } finally {
    running = false;
  }
}

async function handleEmail(email: RawEmail): Promise<void> {
  await ingestPaymentMessage({
    uid: email.messageId,
    text: email.text,
    checkSender: true,
  });
}

/**
 * Opens a fresh IMAP connection, fetches UNSEEN messages (marking them seen),
 * and returns their parsed text. A new connection per poll avoids stale sockets.
 */
function fetchUnseen(): Promise<RawEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.imap.user,
      password: config.imap.password,
      host: config.imap.host,
      port: config.imap.port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 15_000,
      connTimeout: 15_000,
    });

    const results: RawEmail[] = [];
    const parsePromises: Promise<void>[] = [];
    let finished = false;

    const finish = (err?: Error): void => {
      if (finished) return;
      finished = true;
      try {
        imap.end();
      } catch {
        /* ignore */
      }
      if (err) {
        reject(err);
      } else {
        Promise.all(parsePromises)
          .then(() => resolve(results))
          .catch(reject);
      }
    };

    imap.once('error', (err: Error) => finish(err));
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (boxErr) => {
        if (boxErr) return finish(boxErr);
        imap.search(['UNSEEN'], (searchErr, uids) => {
          if (searchErr) return finish(searchErr);
          if (!uids || uids.length === 0) return finish();

          const fetch = imap.fetch(uids, { bodies: '', markSeen: true });
          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              const p = simpleParser(stream as Readable)
                .then((mail) => {
                  results.push({
                    messageId:
                      mail.messageId ?? `${Date.now()}-${Math.random()}`,
                    text: mail.text ?? '',
                  });
                })
                .catch(() => {
                  /* skip unparseable message */
                });
              parsePromises.push(p);
            });
          });
          fetch.once('error', (fetchErr) => finish(fetchErr));
          fetch.once('end', () => finish());
        });
      });
    });

    imap.connect();
  });
}
