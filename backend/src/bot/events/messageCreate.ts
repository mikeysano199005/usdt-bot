import { Client, Message, ChannelType } from 'discord.js';

export function registerMessageCreate(client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.DM) return;
    // DM messages during active flows are handled by awaitMessages() collectors in buyFlow.ts
    // This handler exists as a fallback for messages outside of active flows
  });
}
