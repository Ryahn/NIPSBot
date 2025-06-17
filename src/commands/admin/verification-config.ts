import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, ChannelType, ChatInputCommandInteraction, MessageFlags, Role } from 'discord.js';
import { models } from '../../database/models';
import Logger from '../../utils/logger';

// Track in-progress interactions to prevent double execution
const processingInteractions = new Set<string>();

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
  .addRoleOption(option =>
    option
      .setName('verified_role')
      .setDescription('Role to assign after successful verification')
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
  // Check if this interaction is already being processed
  if (processingInteractions.has(interaction.id)) {
    Logger.warn('Duplicate interaction received', { 
      interactionId: interaction.id,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });
    return;
  }

  // Mark this interaction as being processed
  processingInteractions.add(interaction.id);

  Logger.info('Command execution started', { 
    command: 'verification-config',
    userId: interaction.user.id,
    guildId: interaction.guildId,
    options: {
      logChannel: interaction.options.getChannel('log_channel')?.id,
      verifiedRole: interaction.options.getRole('verified_role')?.id,
      timeout: interaction.options.getInteger('timeout'),
      reminderTime: interaction.options.getInteger('reminder_time')
    }
  });
  
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    
    if (!guildId) {
      return await interaction.editReply('❌ This command can only be used in a server!');
    }

    const logChannel = interaction.options.getChannel('log_channel');
    const verifiedRole = interaction.options.getRole('verified_role');
    const timeout = interaction.options.getInteger('timeout');
    const reminderTime = interaction.options.getInteger('reminder_time');
    
    // Get or create settings
    let settings;
    try {
      settings = await models.VerificationSettings.query()
        .where('guild_id', guildId)
        .first();
    } catch (error) {
      Logger.error('Database query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        guildId
      });
      throw error;
    }

    if (!settings) {
      try {
        settings = await models.VerificationSettings.query().insert({
          guild_id: guildId,
          log_channel_id: logChannel?.id || null,
          verified_role_id: verifiedRole?.id || null,
          verification_timeout: timeout || 300,
          reminder_time: reminderTime || 60
        });
      } catch (error) {
        Logger.error('Failed to create new settings', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          guildId
        });
        throw error;
      }
    } else {
      try {
        // Update existing settings
        await models.VerificationSettings.query()
          .where('guild_id', guildId)
          .patch({
            log_channel_id: logChannel?.id || settings.log_channel_id,
            verified_role_id: verifiedRole?.id || settings.verified_role_id,
            verification_timeout: timeout || settings.verification_timeout,
            reminder_time: reminderTime || settings.reminder_time
          });
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
      `Verified Role: ${verifiedRole ? `<@&${verifiedRole.id}>` : 'Not set'}`,
      `Timeout: ${timeout || settings.verification_timeout} seconds`,
      `Reminder Time: ${reminderTime || settings.reminder_time} seconds before expiry`
    ].join('\n');

    try {
      await interaction.editReply(response);
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
  } finally {
    // Remove the interaction from the processing set
    processingInteractions.delete(interaction.id);
  }
} 