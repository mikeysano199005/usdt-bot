import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getSetting } from '../../services/settingsService';
import { getOrdersByDiscordId } from '../../services/orderService';

export async function handleSupport(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const [contact, responseHours, orders] = await Promise.all([
    getSetting('support_contact'),
    getSetting('support_response_hours'),
    getOrdersByDiscordId(interaction.user.id),
  ]);

  const openOrders = orders.filter(
    (o) => !['completed', 'rejected'].includes(o.status)
  );

  const embed = new EmbedBuilder()
    .setTitle('🛟 Support')
    .setColor(0x10b981)
    .setDescription(
      `Need help with an order? Contact our support team.\n\n**Support Contact:** ${contact ?? '@support'}\n**Typical Response Time:** ${responseHours ?? '2'} hours`
    );

  if (openOrders.length > 0) {
    embed.addFields({
      name: '📋 Your Open Orders (reference these when contacting support)',
      value: openOrders
        .map((o) => `• **${o.order_ref}** — ${o.status.replace(/_/g, ' ')} — ₹${o.inr_amount}`)
        .join('\n'),
    });
  }

  embed.setFooter({
    text: 'Please have your order reference number ready when contacting support.',
  });

  await interaction.editReply({ embeds: [embed] });
}
