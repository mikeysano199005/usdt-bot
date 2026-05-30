import { ChatInputCommandInteraction } from 'discord.js';
import { upsertUser } from '../../services/userService';
import { startBuyFlow } from '../flows/buyFlow';

export async function handleBuy(interaction: ChatInputCommandInteraction): Promise<void> {
  await upsertUser({
    discordId: interaction.user.id,
    username: interaction.user.username,
    displayName: interaction.user.displayName,
  });

  await interaction.reply({
    content: '📩 Check your **DMs** — I\'ve sent you a message to start your USDT purchase!',
    ephemeral: true,
  });

  await startBuyFlow(interaction.user);
}
