import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, AutocompleteInteraction } from 'discord.js';
import AllianceMembers from '../../database/models/AllianceMembers';
import UserAlliances from '../../database/models/UserAlliances';

export const data = new SlashCommandBuilder()
  .setName('add_alliance_member')
  .setDescription('Adds a member to an alliance')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to add to the alliance')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('alliance')
      .setDescription('The alliance to add the user to')
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
    const hasR5Role = member.roles.cache.some(role => role.name === 'R5');
    const hasR4Role = member.roles.cache.some(role => role.name === 'R4');
    const hasModerateMembers = member.permissions.has(PermissionFlagsBits.ModerateMembers);

    if (!hasModerateMembers && !hasR5Role && !hasR4Role) {
      return await interaction.editReply('❌ You need to have either the Moderate Members permission or the R5/R4 role to use this command.');
    }

    const targetUser = interaction.options.getUser('user', true);
    const allianceTag = interaction.options.getString('alliance', true);

    // Get the member object
    const targetMember = await guild.members.fetch(targetUser.id);
    if (!targetMember) {
      return await interaction.editReply('Could not find the specified user in the server.');
    }

    // Check if the user is the server owner
    const isServerOwner = targetMember.id === guild.ownerId;

    // Find the alliance in the database
    const alliance = await AllianceMembers.query()
      .where('tag', allianceTag)
      .first();

    if (!alliance) {
      return await interaction.editReply('❌ Could not find the specified alliance.');
    }

    // Check if user is already in this alliance
    const existingMembership = await UserAlliances.query()
      .where('user_id', targetUser.id)
      .where('alliance_id', alliance.id)
      .first();

    if (existingMembership) {
      return await interaction.editReply('❌ User is already a member of this alliance.');
    }

    // Get the role
    const role = guild.roles.cache.get(alliance.role_id);
    if (!role) {
      return await interaction.editReply('❌ Could not find the alliance role.');
    }

    // Add the role to the member
    await targetMember.roles.add(role);

    // Store the original nickname
    const originalNickname = targetMember.nickname || targetMember.user.username;

    // Try to update the nickname, but don't fail if we can't
    try {
      const newNickname = `${alliance.tag} ${originalNickname}`;
      
      // Get bot member and check permissions
      const botMember = await guild.members.fetch(interaction.client.user.id);
      const botPermissions = botMember.permissions;
      
      if (isServerOwner) {
        // Store membership without nickname update
        await UserAlliances.query().insert({
          user_id: targetUser.id,
          alliance_id: alliance.id,
          original_nickname: originalNickname
        });
        
        await interaction.editReply(`✅ Successfully added ${targetUser.username} to alliance ${alliance.name}. Note: Could not update nickname as the user is the server owner.`);
        return;
      }

      if (botPermissions.has(PermissionFlagsBits.ManageNicknames) || botPermissions.has(PermissionFlagsBits.Administrator)) {
        try {
          await targetMember.setNickname(newNickname);
          
          // Store membership with nickname update
          await UserAlliances.query().insert({
            user_id: targetUser.id,
            alliance_id: alliance.id,
            original_nickname: originalNickname
          });
          
          await interaction.editReply(`✅ Successfully added ${targetUser.username} to alliance ${alliance.name} and updated their nickname.`);
        } catch (nicknameError) {
          console.error('Detailed nickname error:', {
            error: nicknameError,
            botRolePosition: botMember.roles.highest.position,
            targetRolePosition: targetMember.roles.highest.position,
            botRoles: botMember.roles.cache.map(r => ({ name: r.name, position: r.position })),
            targetRoles: targetMember.roles.cache.map(r => ({ name: r.name, position: r.position }))
          });
          
          // Store membership without nickname update
          await UserAlliances.query().insert({
            user_id: targetUser.id,
            alliance_id: alliance.id,
            original_nickname: originalNickname
          });
          
          await interaction.editReply(`✅ Successfully added ${targetUser.username} to alliance ${alliance.name}. Note: Could not update nickname.`);
        }
      } else {
        console.log('Bot missing ManageNicknames permission');
        
        // Store membership without nickname update
        await UserAlliances.query().insert({
          user_id: targetUser.id,
          alliance_id: alliance.id,
          original_nickname: originalNickname
        });
        
        await interaction.editReply(`✅ Successfully added ${targetUser.username} to alliance ${alliance.name}. Note: Could not update nickname due to missing permissions.`);
      }
    } catch (nicknameError) {
      console.error('Error updating nickname:', nicknameError);
      
      // Store membership without nickname update
      await UserAlliances.query().insert({
        user_id: targetUser.id,
        alliance_id: alliance.id,
        original_nickname: originalNickname
      });
      
      await interaction.editReply(`✅ Successfully added ${targetUser.username} to alliance ${alliance.name}. Note: Could not update nickname.`);
    }
  } catch (error) {
    console.error('Error in add_alliance_member command:', error);
    await interaction.editReply('❌ An error occurred while adding the member to the alliance.');
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
    console.error('Error in alliance autocomplete:', error);
    await interaction.respond([]);
  }
} 