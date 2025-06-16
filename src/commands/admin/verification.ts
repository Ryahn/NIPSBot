import { SlashCommandBuilder, MessageFlags, CommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('verification')
  .setDescription('Set up the verification system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const channel = interaction.channel;
    if (!(channel instanceof TextChannel)) {
      return await interaction.editReply('❌ This command can only be used in text channels!');
    }

    const embed = new EmbedBuilder()
      .setTitle('Server Verification')
      .setDescription('Click the button below to verify yourself and gain access to the server.')
      .setColor('#0099ff')
      .setFooter({ text: 'Verification is required to access the server' });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verify_button')
          .setLabel('Verify')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✅')
      );

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.editReply('✅ Verification system has been set up!');
  } catch (error) {
    console.error('Error in verification command:', error);
    await interaction.editReply('❌ An error occurred while setting up the verification system.');
  }
}