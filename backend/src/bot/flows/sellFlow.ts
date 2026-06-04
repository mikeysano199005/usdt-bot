import {
  User,
  EmbedBuilder,
  ButtonInteraction,
  TextChannel,
} from 'discord.js';
import { getSetting } from '../../services/settingsService';
import { getSellRate } from '../../services/priceService';
import { getUserByDiscordId } from '../../services/userService';
import { createSellOrder } from '../../services/orderService';
import { saveUploadedFile } from '../../services/fileService';
import { sendAdminChannelAlert } from '../../services/notificationService';
import { buildNetworkSelect } from '../components/networkSelect';
import { createTicketChannel, buildCloseButton } from './ticketUtils';
import { askWithRetry, askForScreenshot, buildCancelRow, AWAIT_TIMEOUT } from './flowHelpers';

const activeFlows = new Map<string, boolean>();

export async function startSellFlow(interaction: ButtonInteraction): Promise<void> {
  const user = interaction.user;

  if (activeFlows.get(user.id)) {
    await interaction.reply({
      content: '⚠️ You already have an active order session. Please complete it first.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const ticket = await createTicketChannel(interaction, 'sell');
  if (!ticket) {
    await interaction.editReply('❌ Could not create your ticket. Please make sure the bot has **Manage Channels** permission.');
    return;
  }

  await interaction.editReply(`✅ Your order ticket has been created: ${ticket}`);

  activeFlows.set(user.id, true);
  try {
    await runSellFlow(user, ticket);
  } finally {
    activeFlows.delete(user.id);
  }
}

async function runSellFlow(user: User, thread: TextChannel): Promise<void> {
  const { rate, display } = await getSellRate();

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('💵 Sell USDT — USDT → INR')
        .setColor(0xf59e0b)
        .setDescription(
          `Welcome <@${user.id}>!\n\n` +
          `**Current Rate:** ${display} per USDT\n\n` +
          '📱 **Supported Wallets:** Trust Wallet • Binance Web3 Wallet\n\n' +
          '• You have **2 minutes** to respond at each step.\n' +
          '• Click the **❌ Cancel Order** button under any step to stop.\n\n' +
          '**Step 1/6:** How much USDT do you want to sell? (e.g. `10`)'
        ),
    ],
  });

  // Step 1: USDT amount
  const usdtStr = await askWithRetry(
    thread, user.id,
    '**Step 1/6:** Enter the USDT amount you want to sell:',
    (msg) => {
      const n = parseFloat(msg.content.trim());
      if (isNaN(n) || n <= 0) return 'Please enter a valid positive number.';
      if (n < 1) return 'Minimum sell is 1 USDT.';
      if (n > 10000) return 'Maximum sell is 10,000 USDT.';
      return null;
    }
  );

  if (!usdtStr || usdtStr === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  const usdtAmount = parseFloat(usdtStr);
  const inrAmount = (usdtAmount * rate).toFixed(2);

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x10b981)
        .addFields(
          { name: '📦 You Send', value: `${usdtAmount} USDT`, inline: true },
          { name: '💵 You Receive', value: `₹${inrAmount}`, inline: true },
          { name: '📈 Rate', value: display, inline: true },
        )
        .setDescription('**Step 2/6:** Select the network you will send USDT from:'),
    ],
    components: [buildNetworkSelect(), buildCancelRow()],
  });

  // Step 2: Network (or cancel)
  let network: string;
  try {
    const compInteraction = await thread.awaitMessageComponent({
      filter: (i) => i.user.id === user.id && (i.customId === 'network_select' || i.customId === 'cancel_flow'),
      time: AWAIT_TIMEOUT,
    });

    if (compInteraction.customId === 'cancel_flow') {
      await compInteraction.update({ content: '❌ Order cancelled. You can close this ticket.', components: [], embeds: [] });
      return;
    }

    network = compInteraction.isStringSelectMenu() ? compInteraction.values[0] : 'BEP20';
    await compInteraction.update({ content: `✅ Network: **${network}**`, components: [], embeds: [] });
  } catch {
    await thread.send('❌ Session timed out. Please use the Sell button again.');
    return;
  }

  // Step 3: Show our wallet address
  const walletKey = `our_wallet_${network.toLowerCase()}` as const;
  const ourWallet = await getSetting(walletKey) ?? 'NOT_CONFIGURED';

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`📤 Send USDT (${network})`)
        .setColor(0xf59e0b)
        .setDescription(
          `Send exactly **${usdtAmount} USDT** on the **${network}** network to:\n\n` +
          `\`\`\`${ourWallet}\`\`\`\n` +
          '⚠️ **Send the exact amount.** Wrong amounts or network will cause delays.\n\n' +
          '📱 **Supported wallets:** Trust Wallet, Binance Web3 Wallet\n\n' +
          '**Step 4/6:** After sending, upload a screenshot of the transaction.'
        ),
    ],
  });

  // Step 4: Screenshot of USDT transfer
  const screenshotUrl = await askForScreenshot(
    thread, user.id,
    '**Step 4/6:** Upload a screenshot of your USDT transfer (jpg/png/webp):'
  );

  if (!screenshotUrl || screenshotUrl === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  // Step 5: TX Hash
  const txHash = await askWithRetry(
    thread, user.id,
    '**Step 5/6:** Enter the **Transaction Hash / TX ID** from your wallet:',
    (msg) => {
      const v = msg.content.trim();
      if (v.length < 10) return 'TX hash too short.';
      if (v.length > 150) return 'TX hash too long.';
      return null;
    }
  );

  if (!txHash || txHash === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  // Step 6: UPI ID to receive INR
  const upiId = await askWithRetry(
    thread, user.id,
    '**Step 6/6:** Enter your **UPI ID** where you want to receive ₹' + inrAmount + ':',
    (msg) => {
      const v = msg.content.trim();
      if (v.length < 3) return 'UPI ID too short.';
      if (v.length > 100) return 'UPI ID too long.';
      return null;
    }
  );

  if (!upiId || upiId === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  await thread.send('⏳ Creating your order...');

  const dbUser = await getUserByDiscordId(user.id);
  if (!dbUser) { await thread.send('❌ User not found. Please try again.'); return; }

  let proofFilename: string;
  try {
    proofFilename = await saveUploadedFile(screenshotUrl, `user_${dbUser.id}_sell_tmp`);
  } catch {
    await thread.send('❌ Failed to save screenshot. Please contact support.');
    return;
  }

  let order;
  try {
    order = await createSellOrder({
      userId: dbUser.id,
      usdtAmount,
      inrAmount: parseFloat(inrAmount),
      exchangeRate: rate,
      network,
      walletAddress: upiId,
      txHash,
      proofFilename,
      discordAttachmentUrl: screenshotUrl,
    });
  } catch {
    await thread.send('❌ Failed to create order. Please contact support.');
    return;
  }

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Sell Order Submitted!')
        .setColor(0x10b981)
        .addFields(
          { name: 'Order Ref', value: `**${order.order_ref}**`, inline: true },
          { name: 'Amount', value: `${usdtAmount} USDT → ₹${inrAmount}`, inline: true },
          { name: 'Network', value: network, inline: true },
          { name: 'Payout UPI', value: upiId, inline: true },
          { name: 'Status', value: '🔍 Under Review', inline: true },
        )
        .setDescription(
          'Your sell order is being reviewed. You\'ll be notified here once the INR is sent to your UPI.\n\n' +
          'Use `/support` if you need help. Click **Close Ticket** below once you\'re done.'
        )
        .setFooter({ text: 'Typical processing time: 1-2 hours' }),
    ],
    components: [buildCloseButton()],
  });

  await sendAdminChannelAlert(order, `${user.username} (${user.id})`);
}
