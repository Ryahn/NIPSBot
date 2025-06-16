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
  Logger.info('Command execution started', { 
    command: 'verification-config',
    userId: interaction.user.id,
    guildId: interaction.guildId
  });
  
  try {
    Logger.debug('Attempting to defer reply');
    await interaction.deferReply({ ephemeral: true });
    Logger.debug('Reply deferred successfully');

    const guildId = interaction.guildId;
    Logger.debug('Guild ID retrieved', { guildId });
    
    if (!guildId) {
      Logger.warn('Command used outside of a server', { userId: interaction.user.id });
      return await interaction.editReply('❌ This command can only be used in a server!');
    }

    const logChannel = interaction.options.getChannel('log_channel');
    const timeout = interaction.options.getInteger('timeout');
    const reminderTime = interaction.options.getInteger('reminder_time');
    
    Logger.debug('Command options received', {
      logChannel: logChannel?.id,
      timeout,
      reminderTime,
      guildId
    });

    // Get or create settings
    Logger.debug('Querying database for existing settings', { guildId });
    let settings;
    try {
      settings = await models.VerificationSettings.query()
        .where('guild_id', guildId)
        .first();
      Logger.debug('Database query completed', { settingsFound: !!settings });
    } catch (error) {
      Logger.error('Database query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        guildId
      });
      throw error;
    }

    if (!settings) {
      Logger.info('Creating new verification settings', { guildId });
      try {
        settings = await models.VerificationSettings.query().insert({
          guild_id: guildId,
          log_channel_id: logChannel?.id || null,
          verification_timeout: timeout || 300,
          reminder_time: reminderTime || 60
        });
        Logger.debug('New settings created successfully', { settings });
      } catch (error) {
        Logger.error('Failed to create new settings', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          guildId
        });
        throw error;
      }
    } else {
      Logger.info('Updating existing settings', { guildId });
      try {
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
      } catch (error) {
        Logger.error('Failed to update settings', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          guildId
        });
        throw error;
      }
    }

    const response = [
      '✅ Verification settings updated:',
      `Log Channel: ${logChannel ? `<#${logChannel.id}>` : 'Not set'}`,
      `Timeout: ${timeout || settings.verification_timeout} seconds`,
      `Reminder Time: ${reminderTime || settings.reminder_time} seconds before expiry`
    ].join('\n');

    Logger.debug('Preparing to send response to user');
    try {
      await interaction.editReply(response);
      Logger.info('Command execution completed successfully', { guildId });
    } catch (error) {
      Logger.error('Failed to send response to user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        guildId
      });
      throw error;
    }
  } catch (error) {
    Logger.error('Error in verification-config command', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      guildId: interaction.guildId,
      userId: interaction.user.id
    });
    
    try {
      await interaction.editReply('❌ An error occurred while updating verification settings.');
    } catch (replyError) {
      Logger.error('Failed to send error message to user', {
        error: replyError instanceof Error ? replyError.message : 'Unknown error',
        stack: replyError instanceof Error ? replyError.stack : undefined,
        originalError: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
} 