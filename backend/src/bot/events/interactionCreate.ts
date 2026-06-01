import { Client, Interaction } from 'discord.js';
import { handleBuy } from '../commands/buy';
import { handleStatus } from '../commands/status';
import { handleSupport } from '../commands/support';
import { handleHelp } from '../commands/help';
import { handleSetup } from '../commands/setup';
import { startBuyFlow } from '../flows/buyFlow';
import { startSellFlow } from '../flows/sellFlow';
import { upsertUser } from '../../services/userService';

const rateLimitMap = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < 60_000);
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return timestamps.length > 20;
}

export function registerInteractionCreate(client: Client): void {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (isRateLimited(interaction.user.id)) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '⚠️ You are sending commands too fast. Please wait a moment.',
          ephemeral: true,
        }).catch(() => {});
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      try {
        switch (interaction.commandName) {
          case 'buy':    await handleBuy(interaction); break;
          case 'status': await handleStatus(interaction); break;
          case 'support': await handleSupport(interaction); break;
          case 'help':   await handleHelp(interaction); break;
          case 'setup':  await handleSetup(interaction); break;
          default:
            await interaction.reply({ content: 'Unknown command.', ephemeral: true });
        }
      } catch (err) {
        console.error(`[Bot] Command error (${interaction.commandName}):`, err);
        const msg = { content: '❌ Something went wrong. Please try again.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
    }

    if (interaction.isButton()) {
      try {
        if (interaction.customId === 'flow_buy') {
          await upsertUser({
            discordId: interaction.user.id,
            username: interaction.user.username,
            displayName: interaction.user.displayName,
          });
          await startBuyFlow(interaction);
        }

        if (interaction.customId === 'flow_sell') {
          await upsertUser({
            discordId: interaction.user.id,
            username: interaction.user.username,
            displayName: interaction.user.displayName,
          });
          await startSellFlow(interaction);
        }
      } catch (err) {
        console.error('[Bot] Button error:', err);
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }).catch(() => {});
        }
      }
    }
  });
}
