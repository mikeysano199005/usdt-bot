import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { Order } from '../types/order';
import config from '../config';

let discordClient: Client | null = null;

export function setClient(client: Client): void {
  discordClient = client;
}

export async function sendAdminChannelAlert(
  order: Order,
  userTag: string
): Promise<void> {
  if (!discordClient) return;

  try {
    const channel = await discordClient.channels.fetch(config.discord.adminChannelId);
    if (!channel || !(channel instanceof TextChannel)) return;

    const embed = new EmbedBuilder()
      .setTitle('🆕 New Order Submitted')
      .setColor(0xf59e0b)
      .addFields(
        { name: 'Order Ref', value: order.order_ref, inline: true },
        { name: 'User', value: userTag, inline: true },
        { name: 'INR Amount', value: `₹${order.inr_amount}`, inline: true },
        { name: 'USDT Amount', value: `${order.usdt_amount} USDT`, inline: true },
        { name: 'Network', value: order.network, inline: true },
        { name: 'Status', value: order.status, inline: true },
        { name: 'Wallet', value: `\`${order.wallet_address}\`` }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch {
    console.error('[Notification] Failed to send admin alert');
  }
}

export async function sendUserDM(
  discordUserId: string,
  message: string
): Promise<void> {
  if (!discordClient) return;

  try {
    const user = await discordClient.users.fetch(discordUserId);
    await user.send(message);
  } catch {
    console.error(`[Notification] Failed to DM user ${discordUserId}`);
  }
}

export async function notifyOrderStatusChange(
  discordUserId: string,
  orderRef: string,
  newStatus: string,
  adminNotes?: string | null
): Promise<void> {
  const statusMessages: Record<string, string> = {
    under_review: `🔍 Your order **${orderRef}** is now under review. We'll get back to you shortly.`,
    approved: `✅ Your order **${orderRef}** has been **approved**! We will send your USDT soon.`,
    rejected: `❌ Your order **${orderRef}** has been **rejected**.${adminNotes ? `\n\nReason: ${adminNotes}` : ''}\n\nPlease contact support with **/support** if you have questions.`,
    usdt_sent: `💸 Your USDT for order **${orderRef}** has been **sent**! Please check your wallet.`,
    completed: `🎉 Your order **${orderRef}** is now **complete**. Thank you for trading with us!`,
  };

  const message = statusMessages[newStatus];
  if (message) await sendUserDM(discordUserId, message);
}
