import { SlashCommandBuilder, MessageFlags, CommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel, ChatInputCommandInteraction } from 'discord.js';
import { models } from '../../database/models';
import Logger from '../../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('verification')
  .setDescription('Set up the verification system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const channel = interaction.channel;
    if (!(channel instanceof TextChannel)) {
      return await interaction.editReply('❌ This command can only be used in text channels!');
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      return await interaction.editReply('❌ This command can only be used in a server!');
    }

    // Get verification settings
    const settings = await models.VerificationSettings.query()
      .where('guild_id', guildId)
      .first();

    const embed = new EmbedBuilder()
      .setTitle('Server Verification')
      .setDescription(`Click the button below to verify yourself and gain access to the server.\n\nYou will have ${settings?.verification_timeout || 300} seconds to complete the verification.`)
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
    Logger.error('Error in verification command:', error);
    await interaction.editReply('❌ An error occurred while setting up the verification system.');
  }
}