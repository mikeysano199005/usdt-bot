import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('📖 USDT Sales Bot — Help')
    .setColor(0x5865f2)
    .setDescription('Buy USDT easily by paying via UPI or bank transfer.')
    .addFields(
      {
        name: '/buy',
        value: 'Start a new USDT purchase. The bot will guide you step by step in DMs.',
      },
      {
        name: '/status',
        value: 'View your recent orders and their current status.',
      },
      {
        name: '/support',
        value: 'Get support contact info if you have an issue with an order.',
      },
      {
        name: '/help',
        value: 'Show this help message.',
      }
    )
    .setFooter({ text: 'All transactions are processed manually and reviewed by our team.' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
