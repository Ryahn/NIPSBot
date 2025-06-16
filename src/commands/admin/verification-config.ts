import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, ChannelType, ChatInputCommandInteraction } from 'discord.js';
import { models } from '../../database/models';

export const data = new SlashCommandBuilder()
  .setName('verification-config')
  .setDescription('Configure verification settings')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option =>
    option
      .setName('log_channel')
      .setDescription('Channel to log verification events')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('timeout')
      .setDescription('Verification timeout in seconds (minimum 60)')
      .setMinValue(60)
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('reminder_time')
      .setDescription('Time before expiry to send reminder in seconds (minimum 30)')
      .setMinValue(30)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      return await interaction.editReply('❌ This command can only be used in a server!');
    }

    const logChannel = interaction.options.getChannel('log_channel');
    const timeout = interaction.options.getInteger('timeout');
    const reminderTime = interaction.options.getInteger('reminder_time');

    // Get or create settings
    let settings = await models.VerificationSettings.query()
      .where('guild_id', guildId)
      .first();

    if (!settings) {
      settings = await models.VerificationSettings.query().insert({
        guild_id: guildId,
        log_channel_id: logChannel?.id || null,
        verification_timeout: timeout || 300,
        reminder_time: reminderTime || 60
      });
    } else {
      // Update existing settings
      await models.VerificationSettings.query()
        .where('guild_id', guildId)
        .patch({
          log_channel_id: logChannel?.id || settings.log_channel_id,
          verification_timeout: timeout || settings.verification_timeout,
          reminder_time: reminderTime || settings.reminder_time,
          updated_at: new Date()
        });
    }

    const response = [
      '✅ Verification settings updated:',
      `Log Channel: ${logChannel ? `<#${logChannel.id}>` : 'Not set'}`,
      `Timeout: ${timeout || settings.verification_timeout} seconds`,
      `Reminder Time: ${reminderTime || settings.reminder_time} seconds before expiry`
    ].join('\n');

    await interaction.editReply(response);
  } catch (error) {
    console.error('Error in verification-config command:', error);
    await interaction.editReply('❌ An error occurred while updating verification settings.');
  }
} 