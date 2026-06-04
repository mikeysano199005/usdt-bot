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
        .setLabel('BEP20 (BSC)')
        .setDescription('USDT on BNB Smart Chain')
        .setValue('BEP20')
        .setEmoji('🟡')
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}
