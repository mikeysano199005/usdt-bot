import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { SELL_COINS } from '../flows/sellConfig';

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

// Coin picker for the Sell flow (USDT / BTC / LTC / ETH).
export function buildCoinSelect(): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId('coin_select')
    .setPlaceholder('Select the coin you want to sell...')
    .addOptions(
      Object.values(SELL_COINS).map((c) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(c.label)
          .setValue(c.code)
          .setEmoji(c.emoji)
      )
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

// How the seller will send the coin: Binance Pay or an on-chain address.
export function buildSendMethodSelect(): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId('sendmethod_select')
    .setPlaceholder('How will you send it?')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Binance Pay')
        .setDescription('Send to our Binance Pay ID (fee-free)')
        .setValue('binance_pay')
        .setEmoji('🅱️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Crypto Address')
        .setDescription('Send on-chain to our wallet address')
        .setValue('onchain')
        .setEmoji('⛓️')
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

// Network picker shown only when selling USDT on-chain (BEP20 / TRC20).
export function buildUsdtNetworkSelect(): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId('usdt_network_select')
    .setPlaceholder('Select the USDT network...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('BEP20 (BSC)')
        .setDescription('USDT on BNB Smart Chain')
        .setValue('BEP20')
        .setEmoji('🟡'),
      new StringSelectMenuOptionBuilder()
        .setLabel('TRC20 (Tron)')
        .setDescription('USDT on the Tron network')
        .setValue('TRC20')
        .setEmoji('🔴')
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}
