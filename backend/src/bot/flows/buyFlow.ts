import {
  User,
  EmbedBuilder,
  ThreadChannel,
  Message,
  ComponentType,
  ButtonInteraction,
  TextChannel,
  ChannelType,
} from 'discord.js';
import { getSetting } from '../../services/settingsService';
import { getBuyRate } from '../../services/priceService';
import { getUserByDiscordId } from '../../services/userService';
import { createOrder } from '../../services/orderService';
import { saveUploadedFile } from '../../services/fileService';
import { sendAdminChannelAlert } from '../../services/notificationService';
import { buildNetworkSelect } from '../components/networkSelect';

const activeFlows = new Map<string, boolean>();
const AWAIT_TIMEOUT = 120_000;
const MAX_RETRIES = 3;

async function waitForMessage(thread: ThreadChannel, userId: string): Promise<Message | null> {
  try {
    const collected = await thread.awaitMessages({
      filter: (m) => m.author.id === userId,
      max: 1,
      time: AWAIT_TIMEOUT,
      errors: ['time'],
    });
    return collected.first() ?? null;
  } catch {
    return null;
  }
}

async function askWithRetry(
  thread: ThreadChannel,
  userId: string,
  prompt: string,
  validate: (msg: Message) => string | null
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await thread.send(prompt);
    else await thread.send(prompt);

    const msg = await waitForMessage(thread, userId);
    if (!msg) return null;

    if (msg.content.trim().toLowerCase() === 'cancel') return 'cancel';

    const error = validate(msg);
    if (!error) return msg.content.trim();

    await thread.send(`❌ ${error} Please try again.`);
  }
  return null;
}

export async function startBuyFlow(interaction: ButtonInteraction): Promise<void> {
  const user = interaction.user;

  if (activeFlows.get(user.id)) {
    await interaction.reply({
      content: '⚠️ You already have an active order session. Please complete it first.',
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: '❌ This only works in a server text channel.', ephemeral: true });
    return;
  }

  const thread = await (channel as TextChannel).threads.create({
    name: `buy-${user.username}-${Date.now().toString().slice(-4)}`,
    autoArchiveDuration: 1440,
    type: ChannelType.PrivateThread,
    reason: `Buy USDT order for ${user.username}`,
  });

  await thread.members.add(user.id);

  await interaction.reply({
    content: `✅ Your order ticket has been created: ${thread}`,
    ephemeral: true,
  });

  activeFlows.set(user.id, true);
  try {
    await runBuyFlow(user, thread);
  } finally {
    activeFlows.delete(user.id);
  }
}

async function runBuyFlow(user: User, thread: ThreadChannel): Promise<void> {
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
          '• Type `cancel` at any time to cancel.\n\n' +
          '**Step 1/6:** How much INR do you want to spend? (e.g. `500`)'
        ),
    ],
  });

  // Step 1: INR amount
  const inrStr = await askWithRetry(
    thread, user.id,
    '**Step 1/6:** Enter the INR amount:',
    (msg) => {
      const n = parseFloat(msg.content.trim());
      if (isNaN(n) || n <= 0) return 'Please enter a valid positive number.';
      if (n < 100) return 'Minimum order is ₹100.';
      if (n > 1_000_000) return 'Maximum order is ₹10,00,000.';
      return null;
    }
  );

  if (!inrStr || inrStr === 'cancel') {
    await thread.send('❌ Order cancelled. This ticket will archive shortly.');
    return;
  }

  const inrAmount = parseFloat(inrStr);
  const usdtAmount = (inrAmount / rate).toFixed(6);

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x10b981)
        .addFields(
          { name: '💵 You Pay', value: `₹${inrAmount}`, inline: true },
          { name: '📦 You Receive', value: `${usdtAmount} USDT`, inline: true },
          { name: '📈 Rate', value: display, inline: true },
        )
        .setDescription('**Step 2/6:** Select the network to receive your USDT:'),
    ],
    components: [buildNetworkSelect()],
  });

  // Step 2: Network
  let network: string;
  try {
    const selectInteraction = await thread.awaitMessageComponent({
      filter: (i) => i.customId === 'network_select' && i.user.id === user.id,
      componentType: ComponentType.StringSelect,
      time: AWAIT_TIMEOUT,
    });
    network = selectInteraction.values[0];
    await selectInteraction.update({ content: `✅ Network: **${network}**`, components: [], embeds: [] });
  } catch {
    await thread.send('❌ Session timed out. Please use the Buy button again.');
    return;
  }

  // Step 3: Wallet address
  const walletAddress = await askWithRetry(
    thread, user.id,
    `**Step 3/6:** Enter your **${network}** wallet address:\n> 📱 Supported wallets: **Trust Wallet**, **Binance Web3 Wallet**`,
    (msg) => {
      const v = msg.content.trim();
      if (v.length < 10) return 'Wallet address too short.';
      if (v.length > 200) return 'Wallet address too long.';
      if (!/^[a-zA-Z0-9]+$/.test(v)) return 'Invalid characters in wallet address.';
      return null;
    }
  );

  if (!walletAddress || walletAddress === 'cancel') {
    await thread.send('❌ Order cancelled.');
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

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('🏦 Payment Instructions')
        .setColor(0xf59e0b)
        .setDescription('Pay the exact amount using UPI or bank transfer:')
        .addFields(
          { name: '📱 UPI ID', value: `\`${upiId}\``, inline: true },
          { name: '💵 Exact Amount', value: `**₹${inrAmount}**`, inline: true },
          { name: '​', value: '​', inline: true },
          { name: '🏦 Bank Transfer', value: `**Bank:** ${bankName}\n**Name:** ${bankAccountName}\n**Account:** \`${bankAccountNumber}\`\n**IFSC:** \`${bankIfsc}\`` }
        )
        .setFooter({ text: 'Step 4/6: After paying, upload a screenshot of your payment.' }),
    ],
  });

  // Step 5: Screenshot
  let screenshotUrl: string | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await thread.send('**Step 5/6:** Please upload your payment screenshot:');

    const msg = await waitForMessage(thread, user.id);
    if (!msg) { await thread.send('❌ Session timed out.'); return; }
    if (msg.content.toLowerCase() === 'cancel') { await thread.send('❌ Cancelled.'); return; }

    const attachment = msg.attachments.first();
    if (!attachment) { await thread.send('❌ No file attached. Please upload an image.'); continue; }

    const ext = attachment.name?.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      await thread.send('❌ Only jpg, jpeg, png, webp files allowed.'); continue;
    }

    screenshotUrl = attachment.url;
    break;
  }

  if (!screenshotUrl) {
    await thread.send('❌ Too many invalid attempts. Please restart.');
    return;
  }

  // Step 6: UTR
  const utrNumber = await askWithRetry(
    thread, user.id,
    '**Step 6/6:** Enter your **UTR / Reference Number** from the payment:',
    (msg) => {
      const v = msg.content.trim();
      if (v.length < 4) return 'UTR number too short.';
      if (v.length > 50) return 'UTR number too long.';
      if (!/^[a-zA-Z0-9]+$/.test(v)) return 'UTR should only contain letters and numbers.';
      return null;
    }
  );

  if (!utrNumber || utrNumber === 'cancel') {
    await thread.send('❌ Order cancelled.');
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
      utrNumber,
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
          'Use `/support` if you need help.'
        )
        .setFooter({ text: 'Typical processing time: 1-2 hours' }),
    ],
  });

  await sendAdminChannelAlert(order, `${user.username} (${user.id})`);
}
