import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, Role, TextChannel } from 'discord.js';
import AllianceMembers from '../../database/models/AllianceMembers';
import UserAlliances from '../../database/models/UserAlliances';

interface ImportedAlliance {
  name: string;
  members: number;
  tag: string;
  channel: string;
  dryRun?: boolean;
}

export const data = new SlashCommandBuilder()
  .setName('alliance_import')
  .setDescription('Imports existing alliance roles and channels into the database')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(option =>
    option
      .setName('dry_run')
      .setDescription('Preview what would be imported without making changes')
      .setRequired(false)
  )
  .addRoleOption(option =>
    option
      .setName('role')
      .setDescription('Specific role to import (optional)')
      .setRequired(false)
  )
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Specific channel to import (optional)')
      .setRequired(false)
  );

async function processAlliance(
  role: Role,
  channel: TextChannel,
  dryRun: boolean,
  importedAlliances: ImportedAlliance[],
  errors: string[]
) {
  // Check if alliance already exists in database
  const existingAlliance = await AllianceMembers.query()
    .where('role_id', role.id)
    .orWhere('channel_id', channel.id)
    .first();

  if (existingAlliance) {
    errors.push(`Alliance already exists in database: ${role.name}`);
    return;
  }

  // Create tag from role name
  const tag = `[${role.name.toUpperCase()}]`;

  // Get role members
  const members = role.members;

  if (dryRun) {
    importedAlliances.push({
      name: role.name,
      members: members.size,
      tag: tag,
      channel: channel.name,
      dryRun: true
    });
    return;
  }

  // Import alliance into database
  const alliance = await AllianceMembers.query().insert({
    name: role.name,
    tag: tag,
    pact_type: ['Non Aggression'], // Default pact type
    role_name: role.name,
    role_id: role.id,
    channel_name: channel.name,
    channel_id: channel.id,
  });

  // Import members
  for (const [memberId, member] of members) {
    try {
      const originalNickname = member.nickname || member.user.username;
      
      await UserAlliances.query().insert({
        user_id: memberId,
        alliance_id: alliance.id,
        original_nickname: originalNickname
      });
    } catch (memberError) {
      errors.push(`Failed to import member ${member.user.username} for alliance ${role.name}`);
    }
  }

  importedAlliances.push({
    name: role.name,
    members: members.size,
    tag: tag,
    channel: channel.name
  });
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const guild = interaction.guild;
    if (!guild) {
      return await interaction.editReply('This command can only be used in a server!');
    }

    // Fetch all guild members first
    await guild.members.fetch();

    const dryRun = interaction.options.getBoolean('dry_run') ?? false;
    const specificRole = interaction.options.getRole('role');
    const specificChannel = interaction.options.getChannel('channel');

    const importedAlliances: ImportedAlliance[] = [];
    const errors: string[] = [];

    // Get all roles and channels
    const roles = guild.roles.cache;
    const channels = guild.channels.cache;

    if (specificRole || specificChannel) {
      // Manual import mode
      const role = specificRole ? roles.get(specificRole.id) : null;
      const channel = specificChannel ? channels.get(specificChannel.id) : null;

      if (!role && !channel) {
        return await interaction.editReply('❌ Please provide either a role or a channel to import.');
      }

      if (role && channel) {
        // Both role and channel specified
        if (channel.name.toLowerCase() !== role.name.toLowerCase()) {
          return await interaction.editReply('❌ The provided role and channel names do not match.');
        }
        if (channel.type !== 0) { // Check if it's a text channel
          return await interaction.editReply('❌ The specified channel must be a text channel.');
        }
        await processAlliance(role, channel as TextChannel, dryRun, importedAlliances, errors);
      } else if (role) {
        // Only role specified, find matching channel
        const matchingChannel = channels.find(ch => 
          ch.name.toLowerCase() === role.name.toLowerCase() && 
          ch.type === 0 // TextChannel
        );
        if (!matchingChannel) {
          return await interaction.editReply(`❌ No matching channel found for role: ${role.name}`);
        }
        await processAlliance(role, matchingChannel as TextChannel, dryRun, importedAlliances, errors);
      } else if (channel) {
        // Only channel specified, find matching role
        if (channel.type !== 0) { // Check if it's a text channel
          return await interaction.editReply('❌ The specified channel must be a text channel.');
        }
        const matchingRole = roles.find(r => 
          r.name.toLowerCase() === channel.name.toLowerCase() &&
          r.name !== '@everyone' &&
          !r.managed
        );
        if (!matchingRole) {
          return await interaction.editReply(`❌ No matching role found for channel: ${channel.name}`);
        }
        await processAlliance(matchingRole, channel as TextChannel, dryRun, importedAlliances, errors);
      }
    } else {
      // Auto import mode - process all roles
      for (const [roleId, role] of roles) {
        // Skip @everyone role and bot roles
        if (role.name === '@everyone' || role.managed) continue;

        // Find corresponding channel
        const channel = channels.find(ch => 
          ch.name.toLowerCase() === role.name.toLowerCase() && 
          ch.type === 0 // TextChannel
        );

        if (!channel) {
          errors.push(`No matching channel found for role: ${role.name}`);
          continue;
        }

        await processAlliance(role, channel as TextChannel, dryRun, importedAlliances, errors);
      }
    }

    // Create response embed
    const embed = new EmbedBuilder()
      .setTitle(dryRun ? 'Alliance Import Preview' : 'Alliance Import Results')
      .setColor(dryRun ? '#FFA500' : '#0099ff')
      .setTimestamp();

    if (importedAlliances.length > 0) {
      embed.addFields({
        name: dryRun ? 'Alliances to be Imported' : 'Successfully Imported Alliances',
        value: importedAlliances.map(a => 
          `• ${a.name} (${a.members} members)\n  Tag: ${a.tag}\n  Channel: ${a.channel}`
        ).join('\n\n')
      });
    }

    if (errors.length > 0) {
      embed.addFields({
        name: 'Errors',
        value: errors.map(e => `• ${e}`).join('\n')
      });
    }

    if (dryRun) {
      embed.setDescription('This is a preview of what would be imported. No changes have been made to the database.');
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in alliance_import command:', error);
    await interaction.editReply('❌ An error occurred while importing alliances.');
  }
} 