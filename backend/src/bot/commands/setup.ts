import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getBuyRate, getSellRate } from '../../services/priceService';
import { setSetting } from '../../services/settingsService';

export async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has('ManageChannels')) {
    await interaction.reply({ content: '❌ You need **Manage Channels** permission to run this.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const [buyRateData, sellRateData] = await Promise.all([getBuyRate(), getSellRate()]);

  await setSetting('shop_channel_id', interaction.channelId);

  const embed = new EmbedBuilder()
    .setTitle('💱 USDT Exchange')
    .setColor(0x5865f2)
    .setDescription('Fast, secure USDT trading. Click a button below to start.')
    .addFields(
      {
        name: '🟢 Buy USDT (INR → USDT)',
        value: `Rate: **${buyRateData.display}** per USDT\nPay via UPI/Bank → Receive USDT`,
        inline: true,
      },
      {
        name: '🔴 Sell USDT (USDT → INR)',
        value: `Rate: **${sellRateData.display}** per USDT\nSend USDT → Receive INR via UPI`,
        inline: true,
      }
    )
    .setFooter({ text: `Rates update every minute • ${new Date().toLocaleTimeString('en-IN')}` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('flow_buy')
      .setLabel('💰 Buy USDT (INR → USDT)')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('flow_sell')
      .setLabel('💵 Sell USDT (USDT → INR)')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.channel!.send({ embeds: [embed], components: [row] });
  await interaction.editReply('✅ Shop message posted!');
}
