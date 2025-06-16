import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, AttachmentBuilder, ChannelType, PermissionsBitField, ColorResolvable } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import Logger from '../../utils/logger';

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

export const data = new SlashCommandBuilder()
  .setName('permimport')
  .setDescription('Imports server permissions and structure from a JSON file')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addAttachmentOption(option =>
    option
      .setName('file')
      .setDescription('The JSON file containing permissions to import')
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();
  
  try {
    const guild = interaction.guild;
    if (!guild) {
      return await interaction.editReply('This command can only be used in a server!');
    }

    const attachment = interaction.options.get('file')?.attachment;
    if (!attachment) {
      return await interaction.editReply('No file provided!');
    }

    // Download and parse the JSON file
    const response = await fetch(attachment.url);
    const jsonData = await response.json() as PermissionData;

    // Validate the JSON structure
    if (!jsonData.roles || !jsonData.channels || !jsonData.categories) {
      return await interaction.editReply('Invalid JSON format! The file must contain roles, channels, and categories.');
    }

    // Process roles
    for (const roleData of jsonData.roles) {
      const existingRole = guild.roles.cache.get(roleData.id);
      const permissions = new PermissionsBitField(roleData.permissions as unknown as bigint);
      
      if (existingRole) {
        await existingRole.edit({
          name: roleData.name,
          color: roleData.color as ColorResolvable,
          permissions: permissions,
          position: roleData.position,
          mentionable: roleData.mentionable,
          hoist: roleData.hoist
        });
      } else {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color as ColorResolvable,
          permissions: permissions,
          position: roleData.position,
          mentionable: roleData.mentionable,
          hoist: roleData.hoist
        });
      }
    }

    // Process categories
    for (const categoryData of jsonData.categories) {
      const existingCategory = guild.channels.cache.get(categoryData.id);
      const permissionOverwrites = categoryData.permissions.map(perm => ({
        id: perm.roleId,
        allow: new PermissionsBitField(perm.allow as unknown as bigint),
        deny: new PermissionsBitField(perm.deny as unknown as bigint)
      }));

      if (existingCategory) {
        if (existingCategory.type === ChannelType.GuildCategory) {
          await existingCategory.edit({
            name: categoryData.name,
            position: categoryData.position,
            permissionOverwrites
          });
        }
      } else {
        await guild.channels.create({
          name: categoryData.name,
          type: ChannelType.GuildCategory,
          position: categoryData.position,
          permissionOverwrites
        });
      }
    }

    // Process channels
    for (const channelData of jsonData.channels) {
      const existingChannel = guild.channels.cache.get(channelData.id);
      const channelType = ChannelType[channelData.type as keyof typeof ChannelType];
      const permissionOverwrites = channelData.permissions.map(perm => ({
        id: perm.roleId,
        allow: new PermissionsBitField(perm.allow as unknown as bigint),
        deny: new PermissionsBitField(perm.deny as unknown as bigint)
      }));
      
      if (existingChannel) {
        await existingChannel.edit({
          name: channelData.name,
          type: channelType as ChannelType.GuildText | ChannelType.GuildAnnouncement,
          parent: channelData.parent,
          permissionOverwrites
        });
      } else {
        await guild.channels.create({
          name: channelData.name,
          type: channelType as ChannelType.GuildText | ChannelType.GuildAnnouncement,
          parent: channelData.parent,
          permissionOverwrites
        });
      }
    }

    await interaction.editReply('✅ Permissions imported successfully!');
  } catch (error) {
    Logger.error('Error in permimport command:', error);
    await interaction.editReply('❌ An error occurred while importing permissions.');
  }
} 