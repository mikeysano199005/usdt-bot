import { Client } from 'discord.js';

export function registerReadyEvent(client: Client): void {
  client.once('ready', (c) => {
    console.log(`[Bot] Logged in as ${c.user.tag}`);
  });
}
