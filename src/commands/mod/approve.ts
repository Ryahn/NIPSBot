import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, Role, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('approve')
  .setDescription('Approve a member with the specified role')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to approve')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('role')
      .setDescription('The role to approve with')
      .setRequired(true)
      .addChoices(
        { name: 'R1', value: 'R1' },
        { name: 'R2', value: 'R2' },
        { name: 'R3', value: 'R3' },
        { name: 'R4', value: 'R4' },
        { name: 'R5', value: 'R5' }
      )
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
    const selectedRole = interaction.options.getString('role', true);
    
    // Get the member object
    const targetMember = await guild.members.fetch(targetUser.id);
    if (!targetMember) {
      return await interaction.editReply('Could not find the specified user in the server.');
    }

    // Find the roles by name
    const approvalRole = guild.roles.cache.find(role => role.name === selectedRole);
    const memberRole = guild.roles.cache.find(role => role.name === 'Member');

    if (!approvalRole) {
      return await interaction.editReply(`Could not find the ${selectedRole} role.`);
    }

    if (!memberRole) {
      return await interaction.editReply('Could not find the Member role.');
    }

    // Add both roles to the member
    await targetMember.roles.add([approvalRole, memberRole]);

    await interaction.editReply(`✅ Successfully approved ${targetUser.username} with the ${selectedRole} role and Member role.`);
  } catch (error) {
    console.error('Error in approve command:', error);
    await interaction.editReply('❌ An error occurred while approving the member.');
  }
} 