import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

export function buildNetworkSelect(): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId('network_select')
    .setPlaceholder('Select a network...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('TRC20 (Tron)')
        .setDescription('USDT on Tron network — lowest fees')
        .setValue('TRC20')
        .setEmoji('🔵'),
      new StringSelectMenuOptionBuilder()
        .setLabel('BEP20 (BSC)')
        .setDescription('USDT on BNB Smart Chain')
        .setValue('BEP20')
        .setEmoji('🟡'),
      new StringSelectMenuOptionBuilder()
        .setLabel('ERC20 (Ethereum)')
        .setDescription('USDT on Ethereum — higher gas fees')
        .setValue('ERC20')
        .setEmoji('🟣')
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}
