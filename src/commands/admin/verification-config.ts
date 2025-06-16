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
  console.log('[VerificationConfig] Command execution started');
  
  try {
    console.log('[VerificationConfig] Deferring reply');
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    console.log('[VerificationConfig] Guild ID:', guildId);
    
    if (!guildId) {
      console.log('[VerificationConfig] No guild ID found');
      return await interaction.editReply('❌ This command can only be used in a server!');
    }

    const logChannel = interaction.options.getChannel('log_channel');
    const timeout = interaction.options.getInteger('timeout');
    const reminderTime = interaction.options.getInteger('reminder_time');
    
    console.log('[VerificationConfig] Options received:', {
      logChannel: logChannel?.id,
      timeout,
      reminderTime
    });

    // Get or create settings
    console.log('[VerificationConfig] Querying database for existing settings');
    let settings = await models.VerificationSettings.query()
      .where('guild_id', guildId)
      .first();

    if (!settings) {
      console.log('[VerificationConfig] No existing settings found, creating new settings');
      settings = await models.VerificationSettings.query().insert({
        guild_id: guildId,
        log_channel_id: logChannel?.id || null,
        verification_timeout: timeout || 300,
        reminder_time: reminderTime || 60
      });
      console.log('[VerificationConfig] New settings created:', settings);
    } else {
      console.log('[VerificationConfig] Updating existing settings');
      // Update existing settings
      await models.VerificationSettings.query()
        .where('guild_id', guildId)
        .patch({
          log_channel_id: logChannel?.id || settings.log_channel_id,
          verification_timeout: timeout || settings.verification_timeout,
          reminder_time: reminderTime || settings.reminder_time,
          updated_at: new Date()
        });
      console.log('[VerificationConfig] Settings updated successfully');
    }

    const response = [
      '✅ Verification settings updated:',
      `Log Channel: ${logChannel ? `<#${logChannel.id}>` : 'Not set'}`,
      `Timeout: ${timeout || settings.verification_timeout} seconds`,
      `Reminder Time: ${reminderTime || settings.reminder_time} seconds before expiry`
    ].join('\n');

    console.log('[VerificationConfig] Sending response to user');
    await interaction.editReply(response);
    console.log('[VerificationConfig] Command execution completed successfully');
  } catch (error) {
    console.error('[VerificationConfig] Error in verification-config command:', error);
    console.error('[VerificationConfig] Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    await interaction.editReply('❌ An error occurred while updating verification settings.');
  }
} 