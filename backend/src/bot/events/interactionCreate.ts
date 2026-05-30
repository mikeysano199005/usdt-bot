import { Client, Interaction } from 'discord.js';
import { handleBuy } from '../commands/buy';
import { handleStatus } from '../commands/status';
import { handleSupport } from '../commands/support';
import { handleHelp } from '../commands/help';
import { startBuyFlow } from '../flows/buyFlow';
import { upsertUser } from '../../services/userService';
import { getOrdersByDiscordId } from '../../services/orderService';

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
          case 'buy':
            await handleBuy(interaction);
            break;
          case 'status':
            await handleStatus(interaction);
            break;
          case 'support':
            await handleSupport(interaction);
            break;
          case 'help':
            await handleHelp(interaction);
            break;
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
      if (interaction.customId === 'start_buy') {
        await upsertUser({
          discordId: interaction.user.id,
          username: interaction.user.username,
          displayName: interaction.user.displayName,
        });
        await interaction.reply({
          content: '📩 Check your **DMs** to start your purchase!',
          ephemeral: true,
        });
        await startBuyFlow(interaction.user);
      }

      if (interaction.customId === 'check_status') {
        const orders = await getOrdersByDiscordId(interaction.user.id);
        if (orders.length === 0) {
          await interaction.reply({ content: 'You have no orders yet.', ephemeral: true });
        } else {
          const lines = orders
            .slice(0, 5)
            .map((o) => `• **${o.order_ref}** — ${o.status.replace(/_/g, ' ')} — ₹${o.inr_amount}`);
          await interaction.reply({ content: lines.join('\n'), ephemeral: true });
        }
      }
    }
  });
}
