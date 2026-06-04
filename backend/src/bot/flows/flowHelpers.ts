import {
  TextChannel,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

export const AWAIT_TIMEOUT = 120_000;
export const MAX_RETRIES = 3;

export function buildCancelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('cancel_flow')
      .setLabel('❌ Cancel Order')
      .setStyle(ButtonStyle.Danger)
  );
}

type WaitResult = Message | 'cancel' | 'timeout';

/**
 * Sends a prompt with a Cancel button and waits for either a text reply
 * from the user OR a click on the Cancel button — whichever comes first.
 */
async function waitForMessageOrCancel(
  channel: TextChannel,
  userId: string,
  prompt: string
): Promise<WaitResult> {
  const promptMsg = await channel.send({ content: prompt, components: [buildCancelRow()] });

  const messagePromise: Promise<WaitResult> = channel
    .awaitMessages({ filter: (m) => m.author.id === userId, max: 1, time: AWAIT_TIMEOUT, errors: ['time'] })
    .then((c) => (c.first() ?? 'timeout') as WaitResult)
    .catch(() => 'timeout' as const);

  const cancelPromise: Promise<WaitResult> = promptMsg
    .awaitMessageComponent({
      filter: (i) => i.user.id === userId && i.customId === 'cancel_flow',
      componentType: ComponentType.Button,
      time: AWAIT_TIMEOUT,
    })
    .then(async (i) => {
      await i.update({ components: [] }).catch(() => {});
      return 'cancel' as const;
    })
    .catch(() => 'timeout' as const);

  const result = await Promise.race([messagePromise, cancelPromise]);
  // remove the cancel button once a reply arrives so it can't be clicked later
  if (result !== 'cancel') await promptMsg.edit({ components: [] }).catch(() => {});
  return result;
}

/**
 * Prompts for a text value, validates it, and retries on invalid input.
 * Returns the trimmed value, 'cancel' (button or timeout), or null.
 */
export async function askWithRetry(
  channel: TextChannel,
  userId: string,
  prompt: string,
  validate: (msg: Message) => string | null
): Promise<string | 'cancel' | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await waitForMessageOrCancel(channel, userId, prompt);
    if (result === 'cancel' || result === 'timeout') return 'cancel';

    const error = validate(result);
    if (!error) return result.content.trim();

    await channel.send(`❌ ${error} Please try again.`);
  }
  return null;
}

/**
 * Prompts for an image upload (with Cancel button), retrying on invalid files.
 * Returns the attachment URL, 'cancel', or null.
 */
export async function askForScreenshot(
  channel: TextChannel,
  userId: string,
  prompt: string
): Promise<string | 'cancel' | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await waitForMessageOrCancel(channel, userId, prompt);
    if (result === 'cancel' || result === 'timeout') return 'cancel';

    const attachment = result.attachments.first();
    if (!attachment) {
      await channel.send('❌ No file attached. Please upload an image.');
      continue;
    }

    const ext = attachment.name?.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      await channel.send('❌ Only jpg, jpeg, png, webp files are allowed.');
      continue;
    }

    return attachment.url;
  }
  return null;
}
