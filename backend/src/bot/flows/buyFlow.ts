import {
  User,
  EmbedBuilder,
  DMChannel,
  Message,
  ComponentType,
} from 'discord.js';
import { getSetting } from '../../services/settingsService';
import { getUserByDiscordId } from '../../services/userService';
import { createOrder } from '../../services/orderService';
import { saveUploadedFile } from '../../services/fileService';
import { sendAdminChannelAlert } from '../../services/notificationService';
import { buildNetworkSelect } from '../components/networkSelect';

const activeFlows = new Map<string, boolean>();
const AWAIT_TIMEOUT = 120_000;
const MAX_RETRIES = 3;

async function waitForMessage(
  channel: DMChannel,
  userId: string,
  timeout = AWAIT_TIMEOUT
): Promise<Message | null> {
  try {
    const collected = await channel.awaitMessages({
      filter: (m) => m.author.id === userId,
      max: 1,
      time: timeout,
      errors: ['time'],
    });
    return collected.first() ?? null;
  } catch {
    return null;
  }
}

async function askWithRetry(
  channel: DMChannel,
  userId: string,
  prompt: string,
  validate: (msg: Message) => string | null
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await channel.send(prompt);
    else await channel.send(prompt);

    const msg = await waitForMessage(channel, userId);
    if (!msg) return null;

    const error = validate(msg);
    if (!error) return msg.content.trim();

    await channel.send(`❌ ${error} Please try again.`);
  }
  return null;
}

export async function startBuyFlow(user: User): Promise<void> {
  if (activeFlows.get(user.id)) {
    try {
      await user.send('⚠️ You already have an active buy session. Please complete it or wait for it to expire.');
    } catch {}
    return;
  }

  activeFlows.set(user.id, true);

  try {
    await runBuyFlow(user);
  } finally {
    activeFlows.delete(user.id);
  }
}

async function runBuyFlow(user: User): Promise<void> {
  let dmChannel: DMChannel;

  try {
    dmChannel = await user.createDM();
  } catch {
    return;
  }

  await dmChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('💰 Buy USDT')
        .setColor(0x5865f2)
        .setDescription(
          'Welcome! I\'ll guide you through purchasing USDT.\n\n' +
          '• You have **2 minutes** to respond to each step.\n' +
          '• Type `cancel` at any time to stop.\n\n' +
          '**Step 1/7:** How much INR do you want to spend? (e.g. `5000`)'
        ),
    ],
  });

  // Step 1: INR Amount
  const inrStr = await askWithRetry(
    dmChannel, user.id,
    '**Step 1/7:** Please enter the INR amount you want to spend:',
    (msg) => {
      if (msg.content.trim().toLowerCase() === 'cancel') return 'Cancelled.';
      const n = parseFloat(msg.content.trim());
      if (isNaN(n) || n <= 0) return 'Please enter a valid positive number.';
      if (n < 100) return 'Minimum order is ₹100.';
      if (n > 1_000_000) return 'Maximum order is ₹10,00,000.';
      return null;
    }
  );

  if (!inrStr || inrStr.toLowerCase() === 'cancel') {
    await dmChannel.send('❌ Order cancelled. Use **/buy** to start again.');
    return;
  }

  const inrAmount = parseFloat(inrStr);

  // Calculate USDT
  const rateStr = await getSetting('exchange_rate');
  const rate = parseFloat(rateStr ?? '88.50');
  const usdtAmount = (inrAmount / rate).toFixed(6);

  await dmChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x10b981)
        .setDescription(
          `💱 **Exchange Rate:** ₹${rate} per USDT\n` +
          `💰 **You Pay:** ₹${inrAmount}\n` +
          `📦 **You Receive:** ${usdtAmount} USDT\n\n` +
          '**Step 2/7:** Please select the network to receive your USDT:'
        ),
    ],
    components: [buildNetworkSelect()],
  });

  // Step 2: Network selection
  let network: string | null = null;
  try {
    const selectInteraction = await dmChannel.awaitMessageComponent({
      filter: (i) => i.customId === 'network_select' && i.user.id === user.id,
      componentType: ComponentType.StringSelect,
      time: AWAIT_TIMEOUT,
    });
    network = selectInteraction.values[0];
    await selectInteraction.update({
      content: `✅ Network selected: **${network}**`,
      components: [],
      embeds: [],
    });
  } catch {
    await dmChannel.send('❌ Session timed out. Use **/buy** to start again.');
    return;
  }

  // Step 3: Wallet address
  const walletAddress = await askWithRetry(
    dmChannel, user.id,
    `**Step 3/7:** Please enter your **${network}** wallet address:`,
    (msg) => {
      const val = msg.content.trim();
      if (val.toLowerCase() === 'cancel') return 'Cancelled.';
      if (val.length < 10) return 'Wallet address is too short.';
      if (val.length > 200) return 'Wallet address is too long.';
      if (!/^[a-zA-Z0-9]+$/.test(val)) return 'Wallet address contains invalid characters.';
      return null;
    }
  );

  if (!walletAddress || walletAddress.toLowerCase() === 'cancel') {
    await dmChannel.send('❌ Order cancelled. Use **/buy** to start again.');
    return;
  }

  // Step 4: Payment instructions
  const [upiId, bankName, bankAccountName, bankAccountNumber, bankIfsc] = await Promise.all([
    getSetting('upi_id'),
    getSetting('bank_name'),
    getSetting('bank_account_name'),
    getSetting('bank_account_number'),
    getSetting('bank_ifsc'),
  ]);

  await dmChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('🏦 Payment Instructions')
        .setColor(0xf59e0b)
        .setDescription('Please make the payment using one of the methods below:')
        .addFields(
          { name: '📱 UPI ID', value: `\`${upiId}\``, inline: true },
          { name: '💵 Amount to Pay', value: `**₹${inrAmount}**`, inline: true },
          { name: '​', value: '​', inline: true },
          { name: '🏦 Bank Transfer', value: [
            `**Bank:** ${bankName}`,
            `**Name:** ${bankAccountName}`,
            `**Account:** \`${bankAccountNumber}\``,
            `**IFSC:** \`${bankIfsc}\``,
          ].join('\n') }
        )
        .setFooter({ text: 'Step 4/7: After paying, upload a screenshot of the payment.' }),
    ],
  });

  // Step 5: Payment screenshot
  let screenshotUrl: string | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await dmChannel.send('**Step 5/7:** Please upload your payment screenshot (jpg/png/webp):');
    }

    const msg = await waitForMessage(dmChannel, user.id);
    if (!msg) {
      await dmChannel.send('❌ Session timed out. Use **/buy** to start again.');
      return;
    }

    if (msg.content.trim().toLowerCase() === 'cancel') {
      await dmChannel.send('❌ Order cancelled.');
      return;
    }

    const attachment = msg.attachments.first();
    if (!attachment) {
      await dmChannel.send('❌ No file attached. Please upload an image file.');
      continue;
    }

    const ext = attachment.name?.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      await dmChannel.send('❌ Only jpg, jpeg, png, and webp files are allowed.');
      continue;
    }

    screenshotUrl = attachment.url;
    break;
  }

  if (!screenshotUrl) {
    await dmChannel.send('❌ Too many invalid attempts. Use **/buy** to start again.');
    return;
  }

  // Step 6: UTR Number
  const utrNumber = await askWithRetry(
    dmChannel, user.id,
    '**Step 6/7:** Please enter your **UTR / Reference Number** from the payment:',
    (msg) => {
      const val = msg.content.trim();
      if (val.toLowerCase() === 'cancel') return 'Cancelled.';
      if (val.length < 4) return 'UTR number is too short.';
      if (val.length > 50) return 'UTR number is too long.';
      if (!/^[a-zA-Z0-9]+$/.test(val)) return 'UTR number should only contain letters and numbers.';
      return null;
    }
  );

  if (!utrNumber || utrNumber.toLowerCase() === 'cancel') {
    await dmChannel.send('❌ Order cancelled. Use **/buy** to start again.');
    return;
  }

  // Step 7: Create order
  await dmChannel.send('⏳ Processing your order...');

  const dbUser = await getUserByDiscordId(user.id);
  if (!dbUser) {
    await dmChannel.send('❌ User not found. Please try /buy again.');
    return;
  }

  let proofFilename: string;
  try {
    proofFilename = await saveUploadedFile(screenshotUrl, `user_${dbUser.id}_tmp`);
  } catch (err) {
    await dmChannel.send('❌ Failed to save your screenshot. Please contact support.');
    console.error('[BuyFlow] File save error:', err);
    return;
  }

  let order;
  try {
    order = await createOrder({
      userId: dbUser.id,
      inrAmount,
      network,
      walletAddress,
      utrNumber,
      proofFilename,
      discordAttachmentUrl: screenshotUrl,
    });
  } catch (err) {
    await dmChannel.send('❌ Failed to create order. Please contact support.');
    console.error('[BuyFlow] Order creation error:', err);
    return;
  }

  await dmChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Order Created Successfully!')
        .setColor(0x10b981)
        .addFields(
          { name: 'Order Reference', value: `**${order.order_ref}**`, inline: true },
          { name: 'Amount', value: `₹${inrAmount} → ${usdtAmount} USDT`, inline: true },
          { name: 'Network', value: network, inline: true },
          { name: 'Status', value: '🔍 Under Review', inline: true },
        )
        .setDescription(
          'Your order has been submitted and is being reviewed by our team.\n' +
          'You will receive a DM when the status changes.\n\n' +
          'Use **/status** to check your order at any time.'
        )
        .setFooter({ text: 'Typical processing time: 1-2 hours' }),
    ],
  });

  // Notify admin
  await sendAdminChannelAlert(order, `${user.username}#${user.discriminator} (${user.id})`);
}
