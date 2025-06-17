import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import AllianceMembers from '../../database/models/AllianceMembers';
import Logger from '../../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('guild_create')
  .setDescription('Creates a guild role')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('The name for the guild role')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const guild = interaction.guild;
    if (!guild) {
      return await interaction.editReply('This command can only be used in a server!');
    }

    // Check if user has required roles or permissions
    const member = await guild.members.fetch(interaction.user.id);
    const hasAdminRole = member.roles.cache.some(role => role.name === 'Admin');
    const hasModerateMembers = member.permissions.has(PermissionFlagsBits.ModerateMembers);

    if (!hasAdminRole && !hasModerateMembers) {
      return await interaction.editReply('❌ You need to have either the Moderate Members permission or the Admin role to use this command.');
    }

    const name = interaction.options.getString('name', true);
    
    // Create the role first
    const role = await guild.roles.create({
      name: name,
      reason: 'Guild role creation',
    });


    const tag = `[${name.toLowerCase().toUpperCase()}]`;

    // Save to database
    await AllianceMembers.query().insert({
      name: name,
      tag: tag,
      role_name: name,
      role_id: role.id,
    });

    await interaction.editReply(`✅ Successfully created guild role: ${name}`);
  } catch (error) {
    Logger.error('Error in guild_create command:', error);
    await interaction.editReply('❌ An error occurred while creating the guild role.');
  }
} 