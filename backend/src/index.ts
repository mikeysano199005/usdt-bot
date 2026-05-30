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

async function main(): Promise<void> {
  console.log('[App] Starting...');

  await runMigrations();

  const app = createExpressApp();
  app.listen(config.port, () => {
    console.log(`[API] Listening on port ${config.port}`);
  });

  await deployCommands();

  registerReadyEvent(client);
  registerInteractionCreate(client);
  registerMessageCreate(client);

  await client.login(config.discord.botToken);

  setClient(client);

  console.log('[App] Ready');
}

main().catch((err) => {
  console.error('[App] Fatal startup error:', err);
  process.exit(1);
});
