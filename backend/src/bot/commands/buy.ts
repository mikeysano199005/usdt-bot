import { ChatInputCommandInteraction } from 'discord.js';
import { getSetting } from '../../services/settingsService';

export async function handleBuy(interaction: ChatInputCommandInteraction): Promise<void> {
  const shopChannelId = await getSetting('shop_channel_id');
  const channelMention = shopChannelId ? `<#${shopChannelId}>` : 'the exchange channel';

  await interaction.reply({
    content: `💰 To buy or sell USDT, go to ${channelMention} and click the **Buy USDT** or **Sell USDT** button!`,
    ephemeral: true,
  });
}
