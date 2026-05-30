import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import config from '../config';

const commands = [
  new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy USDT — start a new purchase order'),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check your recent order statuses'),
  new SlashCommandBuilder()
    .setName('support')
    .setDescription('Get support contact info and your open orders'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands and how to use the bot'),
].map((cmd) => cmd.toJSON());

export async function deployCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.botToken);

  try {
    console.log('[Bot] Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands }
    );
    console.log('[Bot] Slash commands registered');
  } catch (err) {
    console.error('[Bot] Failed to register commands:', err);
    throw err;
  }
}
