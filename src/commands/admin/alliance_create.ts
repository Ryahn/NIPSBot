import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, PermissionsBitField, EmbedBuilder } from 'discord.js';
import AllianceMembers from '../../database/models/AllianceMembers';

const PACT_TYPES = [
  'Non Aggression',
  'Mutual Friendship',
  'Call To Arms',
  'Protectorate'
] as const;

export const data = new SlashCommandBuilder()
  .setName('alliance_create')
  .setDescription('Creates a new alliance channel and role')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('The name for the alliance channel and role')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('pact_type_1')
      .setDescription('First pact type')
      .setRequired(true)
      .addChoices(
        ...PACT_TYPES.map(type => ({ name: type, value: type }))
      )
  )
  .addStringOption(option =>
    option
      .setName('pact_type_2')
      .setDescription('Second pact type (optional)')
      .setRequired(false)
      .addChoices(
        ...PACT_TYPES.map(type => ({ name: type, value: type }))
      )
  )
  .addStringOption(option =>
    option
      .setName('pact_type_3')
      .setDescription('Third pact type (optional)')
      .setRequired(false)
      .addChoices(
        ...PACT_TYPES.map(type => ({ name: type, value: type }))
      )
  )
  .addStringOption(option =>
    option
      .setName('pact_type_4')
      .setDescription('Fourth pact type (optional)')
      .setRequired(false)
      .addChoices(
        ...PACT_TYPES.map(type => ({ name: type, value: type }))
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

    const name = interaction.options.getString('name', true);
    const pactTypes = [
      interaction.options.getString('pact_type_1', true),
      interaction.options.getString('pact_type_2'),
      interaction.options.getString('pact_type_3'),
      interaction.options.getString('pact_type_4')
    ].filter((type): type is string => type !== null) as typeof PACT_TYPES[number][];
    
    const categoryId = '1381382072823840920'; // Embysees category ID

    // Create the role first
    const role = await guild.roles.create({
      name: name,
      reason: 'Alliance role creation',
    });

    // Define the permissions for the channel
    const permissions = new PermissionsBitField([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.UseExternalStickers,
      PermissionFlagsBits.UseApplicationCommands
    ]);

    // Create the channel
    const channel = await guild.channels.create({
      name: name.toLowerCase(),
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone role
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: role.id,
          allow: permissions,
        },
      ],
    });

    // Create and send the pact types message
    const embed = new EmbedBuilder()
      .setTitle(`Alliance Pact Types for ${name}`)
      .setDescription('This alliance has the following pact types:')
      .addFields(
        pactTypes.map((type, index) => ({
          name: `Pact Type ${index + 1}`,
          value: type,
          inline: true
        }))
      )
      .setColor('#0099ff')
      .setTimestamp();

    const message = await channel.send({ embeds: [embed] });
    await message.pin();

    const tag = `[${name.toLowerCase().toUpperCase()}]`;

    // Save to database
    await AllianceMembers.query().insert({
      name: name,
      tag: tag,
      pact_type: pactTypes,
      role_name: name,
      role_id: role.id,
      channel_name: name.toLowerCase(),
      channel_id: channel.id,
    });

    await interaction.editReply(`✅ Successfully created alliance channel and role: ${name} (${pactTypes.join(', ')})`);
  } catch (error) {
    console.error('Error in alliance_create command:', error);
    await interaction.editReply('❌ An error occurred while creating the alliance channel and role.');
  }
} 