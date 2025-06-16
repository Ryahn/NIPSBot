import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, AutocompleteInteraction } from 'discord.js';
import AllianceMembers from '../../database/models/AllianceMembers';
import UserAlliances from '../../database/models/UserAlliances';
import Logger from '../../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('remove_guild_member')
  .setDescription('Removes a member from a guild')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to remove from the guild')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('guild')
      .setDescription('The guild to remove the user from')
      .setRequired(true)
      .setAutocomplete(true)
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
      return await interaction.editReply('❌ You need to have either the Moderate Members permission or the R5/R4 role to use this command.');
    }

    const targetUser = interaction.options.getUser('user', true);
    const guildName = interaction.options.getString('guild', true);

    // Get the member object
    const targetMember = await guild.members.fetch(targetUser.id);
    if (!targetMember) {
      return await interaction.editReply('Could not find the specified user in the server.');
    }

    // Find the alliance in the database
    const alliance = await AllianceMembers.query()
      .where('name', guildName)
      .first();

    if (!alliance) {
      return await interaction.editReply('❌ Could not find the specified guild.');
    }

    // Check if user is in this alliance
    const existingMembership = await UserAlliances.query()
      .where('user_id', targetUser.id)
      .where('alliance_id', alliance.id)
      .first();

    if (!existingMembership) {
      return await interaction.editReply('❌ User is not a member of this guild.');
    }

    // Get the role
    const role = guild.roles.cache.get(alliance.role_id);
    if (!role) {
      return await interaction.editReply('❌ Could not find the guild role.');
    }

    // Remove the role from the member
    await targetMember.roles.remove(role);

    // Try to restore the original nickname
    try {
      const botMember = await guild.members.fetch(interaction.client.user.id);
      const botPermissions = botMember.permissions;

      if (botPermissions.has(PermissionFlagsBits.ManageNicknames) || botPermissions.has(PermissionFlagsBits.Administrator)) {
        if (existingMembership.original_nickname) {
          await targetMember.setNickname(existingMembership.original_nickname);
        } else {
          await targetMember.setNickname(null); // Reset to username if no original nickname stored
        }
      }
    } catch (nicknameError) {
      Logger.error('Error restoring nickname:', nicknameError);
      // Continue with removal even if nickname restoration fails
    }

    // Remove the membership from the database
    await UserAlliances.query()
      .where('user_id', targetUser.id)
      .where('alliance_id', alliance.id)
      .delete();

    await interaction.editReply(`✅ Successfully removed ${targetUser.username} from guild ${alliance.name}.`);
  } catch (error) {
    Logger.error('Error in remove_guild_member command:', error);
    await interaction.editReply('❌ An error occurred while removing the member from the guild.');
  }
}

// Autocomplete handler for alliance selection
export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  
  try {
    // Get all alliances from the database
    const alliances = await AllianceMembers.query()
      .select('tag', 'name')
      .orderBy('name');

    // Filter and format the results
    const filtered = alliances
      .filter(alliance => 
        alliance.tag.toLowerCase().includes(focusedValue.toLowerCase()) ||
        alliance.name.toLowerCase().includes(focusedValue.toLowerCase())
      )
      .map(alliance => ({
        name: `${alliance.name} (${alliance.tag})`,
        value: alliance.tag
      }))
      .slice(0, 25); // Discord has a limit of 25 choices

    await interaction.respond(filtered);
  } catch (error) {
    Logger.error('Error in guild autocomplete:', error);
    await interaction.respond([]);
  }
} 