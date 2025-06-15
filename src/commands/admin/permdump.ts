import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, GuildChannel, Role, CategoryChannel, PermissionOverwriteManager, ChannelType, AttachmentBuilder } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export const data = new SlashCommandBuilder()
  .setName('permdump')
  .setDescription('Dumps server permissions and structure to a JSON file')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

interface PermissionData {
  roles: {
    id: string;
    name: string;
    color: string;
    permissions: string[];
    position: number;
    mentionable: boolean;
    hoist: boolean;
  }[];
  channels: {
    id: string;
    name: string;
    type: string;
    parent?: string;
    permissions: {
      roleId: string;
      allow: string[];
      deny: string[];
    }[];
  }[];
  categories: {
    id: string;
    name: string;
    position: number;
    permissions: {
      roleId: string;
      allow: string[];
      deny: string[];
    }[];
  }[];
}

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();
  
  try {
    const guild = interaction.guild;
    if (!guild) {
      return await interaction.editReply('This command can only be used in a server!');
    }

    const permissionData: PermissionData = {
      roles: [],
      channels: [],
      categories: []
    };

    // Process roles
    for (const role of guild.roles.cache.values()) {
      if (role.name === '@everyone') continue;
      
      permissionData.roles.push({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        permissions: role.permissions.toArray(),
        position: role.position,
        mentionable: role.mentionable,
        hoist: role.hoist
      });
    }

    // Process channels and categories
    for (const channel of guild.channels.cache.values()) {
      if (!('permissionOverwrites' in channel)) continue;

      const overwrites = channel.permissionOverwrites as PermissionOverwriteManager;
      const channelData = {
        id: channel.id,
        name: channel.name,
        type: ChannelType[channel.type],
        parent: channel.parent?.id,
        permissions: overwrites.cache.map(perm => ({
          roleId: perm.id,
          allow: perm.allow.toArray(),
          deny: perm.deny.toArray()
        }))
      };

      if (channel instanceof CategoryChannel) {
        permissionData.categories.push({
          id: channel.id,
          name: channel.name,
          position: channel.position,
          permissions: overwrites.cache.map(perm => ({
            roleId: perm.id,
            allow: perm.allow.toArray(),
            deny: perm.deny.toArray()
          }))
        });
      } else {
        permissionData.channels.push(channelData);
      }
    }

    // Create dumps directory if it doesn't exist
    const dumpsDir = path.join(process.cwd(), 'dumps');
    await fs.mkdir(dumpsDir, { recursive: true });

    // Save to file
    const fileName = `permissions_${guild.id}_${Date.now()}.json`;
    const filePath = path.join(dumpsDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(permissionData, null, 2));

    // Create attachment and send file
    const attachment = new AttachmentBuilder(filePath, { name: fileName });
    await interaction.editReply({ 
      content: '✅ Permission dump completed!',
      files: [attachment]
    });

    // Clean up the file after sending
    await fs.unlink(filePath).catch(console.error);
  } catch (error) {
    console.error('Error in permdump command:', error);
    await interaction.editReply('❌ An error occurred while dumping permissions.');
  }
} 