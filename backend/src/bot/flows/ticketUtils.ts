import {
  ButtonInteraction,
  TextChannel,
  CategoryChannel,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Guild,
} from 'discord.js';

const TICKET_CATEGORY_NAME = 'USDT Tickets';

async function getOrCreateCategory(guild: Guild): Promise<CategoryChannel | null> {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === TICKET_CATEGORY_NAME
  ) as CategoryChannel | undefined;
  if (existing) return existing;

  try {
    return await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  } catch {
    return null;
  }
}

/**
 * Creates a private ticket channel visible only to the user, the bot,
 * and server staff (anyone with Manage Channels). Returns the channel
 * or null if creation failed.
 */
export async function createTicketChannel(
  interaction: ButtonInteraction,
  prefix: 'buy' | 'sell'
): Promise<TextChannel | null> {
  const guild = interaction.guild;
  if (!guild) return null;

  const category = await getOrCreateCategory(guild);
  const botId = interaction.client.user.id;

  try {
    const channel = await guild.channels.create({
      name: `${prefix}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      type: ChannelType.GuildText,
      parent: category ?? undefined,
      topic: `${prefix === 'buy' ? 'Buy' : 'Sell'} USDT ticket for ${interaction.user.tag} (${interaction.user.id})`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: botId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });
    return channel;
  } catch (err) {
    console.error('[Ticket] Failed to create ticket channel:', err);
    return null;
  }
}

export function buildCloseButton(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Secondary)
  );
}
