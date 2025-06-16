import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, Role } from 'discord.js';
import AllianceMembers from '../../database/models/AllianceMembers';
import UserAlliances from '../../database/models/UserAlliances';

interface ImportedAlliance {
  name: string;
  members: number;
  tag: string;
  dryRun?: boolean;
}

export const data = new SlashCommandBuilder()
  .setName('guild_import')
  .setDescription('Imports existing guild roles into the database')
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
  );

async function processAlliance(
  role: Role,
  dryRun: boolean,
  importedAlliances: ImportedAlliance[],
  errors: string[]
) {
  // Check if alliance already exists in database
  const existingAlliance = await AllianceMembers.query()
    .where('role_id', role.id)
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
      dryRun: true
    });
    return;
  }

  // Import alliance into database
  const alliance = await AllianceMembers.query().insert({
    name: role.name,
    tag: tag,
    role_name: role.name,
    role_id: role.id,
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

    const importedAlliances: ImportedAlliance[] = [];
    const errors: string[] = [];

    // Get all roles and channels
    const roles = guild.roles.cache;

    if (specificRole) {
      // Manual import mode
      const role = specificRole ? roles.get(specificRole.id) : null;

      if (!role) {
        return await interaction.editReply('❌ Please provide a role to import.');
      }

      await processAlliance(role, dryRun, importedAlliances, errors);
    } else {
      // Auto import mode - process all roles
      for (const [roleId, role] of roles) {
        // Skip @everyone role and bot roles
        if (role.name === '@everyone' || role.managed) continue;

        await processAlliance(role, dryRun, importedAlliances, errors);
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
          `• ${a.name} (${a.members} members)\n  Tag: ${a.tag}`
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