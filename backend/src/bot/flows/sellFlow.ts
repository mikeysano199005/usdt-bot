import {
  User,
  EmbedBuilder,
  ButtonInteraction,
  TextChannel,
} from 'discord.js';
import { getSetting } from '../../services/settingsService';
import { getSellRateForCoin } from '../../services/priceService';
import { getUserByDiscordId } from '../../services/userService';
import { createSellOrder } from '../../services/orderService';
import { saveUploadedFile } from '../../services/fileService';
import { sendAdminChannelAlert } from '../../services/notificationService';
import {
  buildCoinSelect,
  buildSendMethodSelect,
  buildUsdtNetworkSelect,
} from '../components/networkSelect';
import { getSellCoin, walletSettingKey } from './sellConfig';
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

/** Waits for a string-select value (or cancel). Returns the value, or 'cancel'. */
async function awaitSelect(
  thread: TextChannel,
  userId: string,
  customId: string
): Promise<string | 'cancel'> {
  try {
    const comp = await thread.awaitMessageComponent({
      filter: (i) => i.user.id === userId && (i.customId === customId || i.customId === 'cancel_flow'),
      time: AWAIT_TIMEOUT,
    });
    if (comp.customId === 'cancel_flow') {
      await comp.update({ content: '❌ Order cancelled. You can close this ticket.', components: [], embeds: [] });
      return 'cancel';
    }
    const value = comp.isStringSelectMenu() ? comp.values[0] : '';
    await comp.update({ content: `✅ Selected: **${value}**`, components: [], embeds: [] });
    return value;
  } catch {
    await thread.send('❌ Session timed out. Please use the Sell button again.');
    return 'cancel';
  }
}

async function runSellFlow(user: User, thread: TextChannel): Promise<void> {
  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('💵 Sell Crypto — Crypto → INR')
        .setColor(0xf59e0b)
        .setDescription(
          `Welcome <@${user.id}>!\n\n` +
          '📱 **Supported Wallets:** Trust Wallet • Binance Web3 Wallet • Binance Pay\n\n' +
          '• You have **2 minutes** to respond at each step.\n' +
          '• Click the **❌ Cancel Order** button under any step to stop.\n\n' +
          '**Step 1/7:** Which coin do you want to sell?'
        ),
    ],
    components: [buildCoinSelect(), buildCancelRow()],
  });

  // Step 1: Coin
  const coinCode = await awaitSelect(thread, user.id, 'coin_select');
  if (coinCode === 'cancel') return;
  const coin = getSellCoin(coinCode);
  if (!coin) { await thread.send('❌ Unknown coin. Please try again.'); return; }

  // Rate must be configured by the operator.
  const { rate, display: rateDisplay } = await getSellRateForCoin(coin.code);
  if (!rate || rate <= 0) {
    await thread.send(`❌ Sorry, selling **${coin.code}** is not available right now. Please contact support with \`/support\`.`);
    return;
  }

  // Step 2: Amount
  const amountStr = await askWithRetry(
    thread, user.id,
    `**Step 2/7:** How much **${coin.code}** do you want to sell? (e.g. \`10\`)`,
    (msg) => {
      const n = parseFloat(msg.content.trim());
      if (isNaN(n) || n <= 0) return 'Please enter a valid positive number.';
      if (n > 1_000_000) return 'That amount is too large.';
      return null;
    }
  );
  if (!amountStr || amountStr === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  const coinAmount = parseFloat(amountStr);
  const inrAmount = (coinAmount * rate).toFixed(2);

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x10b981)
        .addFields(
          { name: '📦 You Send', value: `${coinAmount} ${coin.code}`, inline: true },
          { name: '💵 You Receive', value: `₹${inrAmount}`, inline: true },
          { name: '📈 Rate', value: `${rateDisplay} / ${coin.code}`, inline: true },
        )
        .setDescription('**Step 3/7:** How would you like to send it?'),
    ],
    components: [buildSendMethodSelect(), buildCancelRow()],
  });

  // Step 3: Send method
  const method = await awaitSelect(thread, user.id, 'sendmethod_select');
  if (method === 'cancel') return;

  // Resolve destination + the network value we store on the order.
  let network: string;
  let destination: string;
  let destinationLabel: string;

  if (method === 'binance_pay') {
    network = 'BINANCE_PAY';
    destination = (await getSetting('binance_pay_id')) ?? '';
    destinationLabel = '🅱️ Binance Pay ID';
    if (!destination) {
      await thread.send('❌ Binance Pay is not available right now. Please choose Crypto Address or contact `/support`.');
      return;
    }
  } else {
    // On-chain. For USDT, ask which network; otherwise it's fixed.
    if (coin.networks.length > 1) {
      await thread.send({
        content: '**Step 3/7:** Select the network you will send from:',
        components: [buildUsdtNetworkSelect(), buildCancelRow()],
      });
      const net = await awaitSelect(thread, user.id, 'usdt_network_select');
      if (net === 'cancel') return;
      network = net;
    } else {
      network = coin.networks[0];
    }

    destination = (await getSetting(walletSettingKey(network))) ?? '';
    destinationLabel = `⛓️ Our ${coin.code} address (${network})`;
    if (!destination) {
      await thread.send(`❌ Our ${coin.code} (${network}) address isn't configured. Please contact \`/support\`.`);
      return;
    }
  }

  // Step 4: Show destination + exact amount
  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`📤 Send ${coin.code}`)
        .setColor(0xf59e0b)
        .setDescription(
          `Send exactly **${coinAmount} ${coin.code}** to:\n\n` +
          `**${destinationLabel}:**\n\`\`\`${destination}\`\`\`\n` +
          '⚠️ **Send the exact amount.** Wrong amount/network can cause delays.\n\n' +
          '**Step 4/7:** After sending, upload a screenshot of the transaction.'
        ),
    ],
  });

  // Step 5: Screenshot
  const screenshotUrl = await askForScreenshot(
    thread, user.id,
    '**Step 5/7:** Upload a screenshot of your transfer (jpg/png/webp):'
  );
  if (!screenshotUrl || screenshotUrl === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  // Step 6: Tx hash / Binance Pay order ID
  const txLabel = method === 'binance_pay' ? 'Binance Pay Order No / Transaction ID' : 'Transaction Hash / TX ID';
  const txHash = await askWithRetry(
    thread, user.id,
    `**Step 6/7:** Enter the **${txLabel}**:`,
    (msg) => {
      const v = msg.content.trim();
      if (v.length < 6) return 'That looks too short.';
      if (v.length > 150) return 'That looks too long.';
      return null;
    }
  );
  if (!txHash || txHash === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  // Step 7: Payout UPI
  const upiId = await askWithRetry(
    thread, user.id,
    `**Step 7/7:** Enter your **UPI ID** where you want to receive ₹${inrAmount}:`,
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
      coin: coin.code,
      usdtAmount: coinAmount,
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

  const methodDisplay = method === 'binance_pay' ? 'Binance Pay' : network;

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Sell Order Submitted!')
        .setColor(0x10b981)
        .addFields(
          { name: 'Order Ref', value: `**${order.order_ref}**`, inline: true },
          { name: 'Amount', value: `${coinAmount} ${coin.code} → ₹${inrAmount}`, inline: true },
          { name: 'Sent Via', value: methodDisplay, inline: true },
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
