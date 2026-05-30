import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildMainMenu(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('start_buy')
      .setLabel('💰 Buy USDT')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('check_status')
      .setLabel('📋 My Orders')
      .setStyle(ButtonStyle.Secondary)
  );
}
