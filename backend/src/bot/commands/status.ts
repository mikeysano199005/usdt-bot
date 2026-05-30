import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getOrdersByDiscordId } from '../../services/orderService';

const STATUS_EMOJI: Record<string, string> = {
  pending_payment: '⏳',
  payment_submitted: '📤',
  under_review: '🔍',
  approved: '✅',
  rejected: '❌',
  usdt_sent: '💸',
  completed: '🎉',
};

export async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const orders = await getOrdersByDiscordId(interaction.user.id);

  if (orders.length === 0) {
    await interaction.editReply('You have no orders yet. Use **/buy** to create one.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Your Recent Orders')
    .setColor(0x5865f2)
    .setDescription('Here are your last 10 orders:');

  for (const order of orders) {
    const emoji = STATUS_EMOJI[order.status] ?? '❓';
    embed.addFields({
      name: `${emoji} ${order.order_ref}`,
      value: [
        `**Amount:** ₹${order.inr_amount} → ${order.usdt_amount} USDT`,
        `**Network:** ${order.network}`,
        `**Status:** ${order.status.replace(/_/g, ' ')}`,
        `**Date:** ${new Date(order.created_at).toLocaleDateString('en-IN')}`,
      ].join('\n'),
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
