import {
  User,
  EmbedBuilder,
  ComponentType,
  ButtonInteraction,
  TextChannel,
  AttachmentBuilder,
} from 'discord.js';
import QRCode from 'qrcode';
import { getSetting } from '../../services/settingsService';
import { getBuyRate } from '../../services/priceService';
import { getUserByDiscordId } from '../../services/userService';
import { createOrder, generateUniqueInrAmount } from '../../services/orderService';
import { saveUploadedFile } from '../../services/fileService';
import { sendAdminChannelAlert } from '../../services/notificationService';
import { buildNetworkSelect } from '../components/networkSelect';
import { createTicketChannel, buildCloseButton } from './ticketUtils';
import { cleanWalletInput, isValidBep20Address } from './walletValidation';
import { askWithRetry, askForScreenshot, buildCancelRow, AWAIT_TIMEOUT } from './flowHelpers';

const activeFlows = new Map<string, boolean>();

export async function startBuyFlow(interaction: ButtonInteraction): Promise<void> {
  const user = interaction.user;

  if (activeFlows.get(user.id)) {
    await interaction.reply({
      content: '⚠️ You already have an active order session. Please complete it first.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const ticket = await createTicketChannel(interaction, 'buy');
  if (!ticket) {
    await interaction.editReply('❌ Could not create your ticket. Please make sure the bot has **Manage Channels** permission.');
    return;
  }

  await interaction.editReply(`✅ Your order ticket has been created: ${ticket}`);

  activeFlows.set(user.id, true);
  try {
    await runBuyFlow(user, ticket);
  } finally {
    activeFlows.delete(user.id);
  }
}

async function runBuyFlow(user: User, thread: TextChannel): Promise<void> {
  const { rate, display } = await getBuyRate();

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('💰 Buy USDT — INR → USDT')
        .setColor(0x5865f2)
        .setDescription(
          `Welcome <@${user.id}>!\n\n` +
          `**Current Rate:** ${display} per USDT\n\n` +
          '📱 **Supported Wallets:** Trust Wallet • Binance Web3 Wallet\n\n' +
          '• You have **2 minutes** to respond at each step.\n' +
          '• Click the **❌ Cancel Order** button under any step to stop.\n\n' +
          '**Step 1/5:** How much INR do you want to spend? (e.g. `500`)'
        ),
    ],
  });

  // Step 1: INR amount
  const inrStr = await askWithRetry(
    thread, user.id,
    '**Step 1/5:** Enter the INR amount:',
    (msg) => {
      const n = parseFloat(msg.content.trim());
      if (isNaN(n) || n <= 0) return 'Please enter a valid positive number.';
      if (n < 100) return 'Minimum order is ₹100.';
      if (n > 1_000_000) return 'Maximum order is ₹10,00,000.';
      return null;
    }
  );

  if (!inrStr || inrStr === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  // Give each order a unique paise amount so an incoming bank credit can be
  // matched to exactly one order (this bank's payment SMS carries no UTR).
  const inrAmount = await generateUniqueInrAmount(parseFloat(inrStr));
  const usdtAmount = (inrAmount / rate).toFixed(6);

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x10b981)
        .addFields(
          { name: '💵 You Pay', value: `₹${inrAmount.toFixed(2)}`, inline: true },
          { name: '📦 You Receive', value: `${usdtAmount} USDT`, inline: true },
          { name: '📈 Rate', value: display, inline: true },
        )
        .setDescription('**Step 2/5:** Select the network to receive your USDT:'),
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
    await thread.send('❌ Session timed out. Please use the Buy button again.');
    return;
  }

  // Step 3: Wallet address (BEP20 = 0x + 40 hex chars)
  const walletRaw = await askWithRetry(
    thread, user.id,
    `**Step 3/5:** Enter your **${network}** wallet address (starts with \`0x\`):\n> 📱 Supported wallets: **Trust Wallet**, **Binance Web3 Wallet**`,
    (msg) => {
      const v = cleanWalletInput(msg.content);
      if (!isValidBep20Address(v)) {
        return 'That doesn\'t look like a valid BEP20 wallet address. It should start with `0x` and be 42 characters long.';
      }
      return null;
    }
  );

  if (!walletRaw || walletRaw === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  const walletAddress = cleanWalletInput(walletRaw);

  // Step 4: Payment instructions
  const [upiId, bankName, bankAccountName, bankAccountNumber, bankIfsc] = await Promise.all([
    getSetting('upi_id'),
    getSetting('bank_name'),
    getSetting('bank_account_name'),
    getSetting('bank_account_number'),
    getSetting('bank_ifsc'),
  ]);

  // Build a UPI QR encoding the payee + exact (unique-paise) amount so the user
  // can scan-to-pay instead of typing the amount (which avoids paise mistakes).
  const paymentEmbed = new EmbedBuilder()
    .setTitle('🏦 Payment Instructions')
    .setColor(0xf59e0b)
    .setDescription(
      '⚠️ **Pay the EXACT amount below — including the paise.**\n' +
      'The paise are unique to your order and are how we auto-detect your payment. ' +
      'Paying a rounded amount will delay verification.\n\n' +
      '📷 **Scan the QR** below in any UPI app — it pre-fills the exact amount.'
    )
    .addFields(
      { name: '📱 UPI ID', value: `\`${upiId}\``, inline: true },
      { name: '💵 Exact Amount', value: `**₹${inrAmount.toFixed(2)}**`, inline: true },
      { name: '​', value: '​', inline: true },
      { name: '🏦 Bank Transfer', value: `**Bank:** ${bankName}\n**Name:** ${bankAccountName}\n**Account:** \`${bankAccountNumber}\`\n**IFSC:** \`${bankIfsc}\`` }
    )
    .setFooter({ text: 'Step 4/5: After paying, upload a screenshot of your payment.' });

  const files: AttachmentBuilder[] = [];
  if (upiId) {
    const upiUri =
      `upi://pay?pa=${encodeURIComponent(upiId)}` +
      `&pn=${encodeURIComponent(bankAccountName ?? 'Merchant')}` +
      `&am=${inrAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('USDT order')}`;
    try {
      const qrBuffer = await QRCode.toBuffer(upiUri, { width: 320, margin: 1 });
      const attachment = new AttachmentBuilder(qrBuffer, { name: 'upi-qr.png' });
      paymentEmbed.setImage('attachment://upi-qr.png');
      files.push(attachment);
    } catch {
      // QR generation failed — fall back to the text instructions only.
    }
  }

  await thread.send({ embeds: [paymentEmbed], files });

  // Step 5: Screenshot
  const screenshotUrl = await askForScreenshot(
    thread, user.id,
    '**Step 5/5:** Please upload your payment screenshot (jpg/png/webp):'
  );

  if (!screenshotUrl || screenshotUrl === 'cancel') {
    await thread.send('❌ Order cancelled. You can close this ticket.');
    return;
  }

  await thread.send('⏳ Creating your order...');

  const dbUser = await getUserByDiscordId(user.id);
  if (!dbUser) { await thread.send('❌ User not found. Please try again.'); return; }

  let proofFilename: string;
  try {
    proofFilename = await saveUploadedFile(screenshotUrl, `user_${dbUser.id}_tmp`);
  } catch {
    await thread.send('❌ Failed to save screenshot. Please contact support.');
    return;
  }

  let order;
  try {
    order = await createOrder({
      userId: dbUser.id,
      inrAmount,
      network,
      walletAddress,
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
        .setTitle('✅ Order Submitted!')
        .setColor(0x10b981)
        .addFields(
          { name: 'Order Ref', value: `**${order.order_ref}**`, inline: true },
          { name: 'Amount', value: `₹${inrAmount} → ${usdtAmount} USDT`, inline: true },
          { name: 'Network', value: network, inline: true },
          { name: 'Status', value: '🔍 Under Review', inline: true },
        )
        .setDescription(
          'Your order is being reviewed. You\'ll be notified here when the status changes.\n\n' +
          'Use `/support` if you need help. Click **Close Ticket** below once you\'re done.'
        )
        .setFooter({ text: 'Typical processing time: 1-2 hours' }),
    ],
    components: [buildCloseButton()],
  });

  await sendAdminChannelAlert(order, `${user.username} (${user.id})`);
}
