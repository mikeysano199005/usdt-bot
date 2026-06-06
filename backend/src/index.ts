import 'dotenv/config';
import config from './config';
import { runMigrations } from './db/pool';
import { createExpressApp } from './api/server';
import client from './bot/client';
import { deployCommands } from './bot/deploy-commands';
import { registerReadyEvent } from './bot/events/ready';
import { registerInteractionCreate } from './bot/events/interactionCreate';
import { registerMessageCreate } from './bot/events/messageCreate';
import { setClient } from './services/notificationService';
import { startImapPoller } from './services/bankSms/imapPoller';

async function main(): Promise<void> {
  console.log('[App] Starting...');

  await runMigrations();

  const app = createExpressApp();
  app.listen(config.port, () => {
    console.log(`[API] Listening on port ${config.port}`);
  });

  // Start the Discord bot separately so a bad token / Discord outage
  // never takes down the Express API (admin panel login depends on it).
  startBot().catch((err) => {
    console.error('[Bot] Bot failed to start (API still running):', err);
  });

  // Bank-SMS-to-email payment verification (no-op unless IMAP_* env vars are set).
  startImapPoller();

  console.log('[App] Ready');
}

async function startBot(): Promise<void> {
  registerReadyEvent(client);
  registerInteractionCreate(client);
  registerMessageCreate(client);

  await client.login(config.discord.botToken);
  setClient(client);

  try {
    await deployCommands();
  } catch (err) {
    console.error('[Bot] Failed to register slash commands:', err);
  }
}

main().catch((err) => {
  console.error('[App] Fatal startup error:', err);
  process.exit(1);
});
