import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, AutocompleteInteraction, EmbedBuilder } from 'discord.js';
import AllianceMembers from '../../database/models/AllianceMembers';
import UserAlliances from '../../database/models/UserAlliances';

export const data = new SlashCommandBuilder()
  .setName('alliance_delete')
  .setDescription('Deletes an alliance channel and role')
  .addStringOption(option =>
    option
      .setName('alliance')
      .setDescription('The alliance to delete')
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

    const allianceTag = interaction.options.getString('alliance', true);

    // Find the alliance in the database
    const alliance = await AllianceMembers.query()
      .where('tag', allianceTag)
      .first();

    if (!alliance) {
      return await interaction.editReply('❌ Could not find the specified alliance.');
    }

    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle('Confirm Alliance Deletion')
      .setDescription(`Are you sure you want to delete the alliance "${alliance.name}"?\nThis will:\n• Delete the alliance role\n• Delete the alliance channel\n• Remove all members from the alliance\n• Delete all alliance data`)
      .setColor('#ff0000')
      .addFields(
        { name: 'Alliance Name', value: alliance.name, inline: true },
        { name: 'Alliance Tag', value: alliance.tag, inline: true },
        { name: 'Pact Types', value: alliance.pact_type.join(', '), inline: true }
      )
      .setTimestamp();

    const confirmMessage = await interaction.editReply({ 
      content: '⚠️ Please confirm the alliance deletion:',
      embeds: [confirmEmbed]
    });

    // Create confirmation buttons
    const confirmButton = {
      type: 2, // Button
      style: 4, // Danger
      label: 'Delete Alliance',
      custom_id: 'confirm_delete'
    };

    const cancelButton = {
      type: 2, // Button
      style: 2, // Secondary
      label: 'Cancel',
      custom_id: 'cancel_delete'
    };

    await interaction.editReply({
      content: '⚠️ Please confirm the alliance deletion:',
      embeds: [confirmEmbed],
      components: [{
        type: 1, // Action Row
        components: [confirmButton, cancelButton]
      }]
    });

    // Wait for button interaction
    const filter = (i: any) => i.user.id === interaction.user.id;
    const collector = confirmMessage.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.customId === 'cancel_delete') {
        await i.update({
          content: '❌ Alliance deletion cancelled.',
          embeds: [],
          components: []
        });
        return;
      }

      if (i.customId === 'confirm_delete') {
        // Get all user alliances before deletion
        const userAlliances = await UserAlliances.query()
          .where('alliance_id', alliance.id)
          .withGraphFetched('alliance');

        // Delete the role if it exists
        const role = guild.roles.cache.get(alliance.role_id);
        if (role) {
          await role.delete('Alliance deletion');
        }

        // Delete the channel if it exists
        const channel = guild.channels.cache.get(alliance.channel_id);
        if (channel) {
          await channel.delete('Alliance deletion');
        }

        // Revert nicknames for all members
        for (const userAlliance of userAlliances) {
          try {
            const member = await guild.members.fetch(userAlliance.user_id);
            if (member && userAlliance.original_nickname) {
              await member.setNickname(userAlliance.original_nickname);
            }
          } catch (error) {
            console.error(`Failed to revert nickname for user ${userAlliance.user_id}:`, error);
          }
        }

        // Delete user alliances first (due to foreign key constraint)
        await UserAlliances.query()
          .where('alliance_id', alliance.id)
          .delete();

        // Delete from database
        await AllianceMembers.query()
          .where('id', alliance.id)
          .delete();

        await i.update({
          content: `✅ Successfully deleted alliance: ${alliance.name}`,
          embeds: [],
          components: []
        });
      }
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          content: '❌ Alliance deletion timed out.',
          embeds: [],
          components: []
        });
      }
    });
  } catch (error) {
    console.error('Error in alliance_delete command:', error);
    await interaction.editReply('❌ An error occurred while deleting the alliance.');
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