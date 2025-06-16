import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, ChannelType, ChatInputCommandInteraction } from 'discord.js';
import { models } from '../../database/models';
import Logger from '../../utils/logger';

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
  Logger.info('Command execution started', { command: 'verification-config' });
  
  try {
    Logger.debug('Deferring reply');
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    Logger.debug('Guild ID retrieved', { guildId });
    
    if (!guildId) {
      Logger.warn('Command used outside of a server');
      return await interaction.editReply('❌ This command can only be used in a server!');
    }

    const logChannel = interaction.options.getChannel('log_channel');
    const timeout = interaction.options.getInteger('timeout');
    const reminderTime = interaction.options.getInteger('reminder_time');
    
    Logger.debug('Command options received', {
      logChannel: logChannel?.id,
      timeout,
      reminderTime
    });

    // Get or create settings
    Logger.debug('Querying database for existing settings');
    let settings = await models.VerificationSettings.query()
      .where('guild_id', guildId)
      .first();

    if (!settings) {
      Logger.info('Creating new verification settings', { guildId });
      settings = await models.VerificationSettings.query().insert({
        guild_id: guildId,
        log_channel_id: logChannel?.id || null,
        verification_timeout: timeout || 300,
        reminder_time: reminderTime || 60
      });
      Logger.debug('New settings created', { settings });
    } else {
      Logger.info('Updating existing settings', { guildId });
      // Update existing settings
      await models.VerificationSettings.query()
        .where('guild_id', guildId)
        .patch({
          log_channel_id: logChannel?.id || settings.log_channel_id,
          verification_timeout: timeout || settings.verification_timeout,
          reminder_time: reminderTime || settings.reminder_time,
          updated_at: new Date()
        });
      Logger.debug('Settings updated successfully');
    }

    const response = [
      '✅ Verification settings updated:',
      `Log Channel: ${logChannel ? `<#${logChannel.id}>` : 'Not set'}`,
      `Timeout: ${timeout || settings.verification_timeout} seconds`,
      `Reminder Time: ${reminderTime || settings.reminder_time} seconds before expiry`
    ].join('\n');

    Logger.debug('Sending response to user');
    await interaction.editReply(response);
    Logger.info('Command execution completed successfully');
  } catch (error) {
    Logger.error('Error in verification-config command', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    await interaction.editReply('❌ An error occurred while updating verification settings.');
  }
} 