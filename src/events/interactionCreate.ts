import { Interaction, ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction, Role } from 'discord.js';
import { config } from '../config/env';
import { generateCaptcha } from '../utils/captcha';
import { knex } from '../database/db';

export const name = 'interactionCreate';

export async function execute(interaction: Interaction) {
  const client = interaction.client;

  if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName)
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`)
      return
    }

    try {
      if (interaction.isChatInputCommand()) {
        await command.execute(interaction)
      } else if (interaction.isAutocomplete() && command.autocomplete) {
        await command.autocomplete(interaction)
      }
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`)
      console.error(error)

      if (interaction.isChatInputCommand()) {
        const errorMessage = { 
          content: 'There was an error while executing this command!', 
          ephemeral: true 
        }
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage)
        } else {
          await interaction.reply(errorMessage)
        }
      }
    }
  } else if (interaction.isButton()) {
    if (interaction.customId === 'verify_button') {
      await handleVerification(interaction);
    } else if (interaction.customId === 'verify_captcha') {
      await handleCaptchaVerification(interaction);
    }
  } else if (interaction.isModalSubmit() && interaction.customId === 'captcha_modal') {
    await handleCaptchaSubmit(interaction);
  }
}

async function handleVerification(interaction: ButtonInteraction) {
  try {
    // Generate a new captcha
    const { image, text } = await generateCaptcha();
    
    // Create verification embed
    const embed = new EmbedBuilder()
      .setTitle('Verification Required')
      .setDescription('Please enter the code shown in the image below to verify yourself.')
      .setColor('#0099ff')
      .setImage('attachment://captcha.png');

    // Create verification button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verify_captcha')
          .setLabel('Enter Code')
          .setStyle(ButtonStyle.Primary)
      );

    // Send DM to user
    await interaction.user.send({
      embeds: [embed],
      components: [row],
      files: [{
        attachment: image,
        name: 'captcha.png'
      }]
    });

    // Store verification data in database
    await knex('verification').insert({
      user_id: interaction.user.id,
      guild_id: interaction.guildId,
      captcha_code: text,
      verified: false
    });

    await interaction.reply({ 
      content: '✅ Please check your DMs to complete the verification process.',
      ephemeral: true 
    });
  } catch (error) {
    console.error('Error in verification process:', error);
    await interaction.reply({ 
      content: '❌ Failed to start verification process. Please make sure your DMs are open.',
      ephemeral: true 
    });
  }
}

async function handleCaptchaVerification(interaction: ButtonInteraction) {
  try {
    // Create modal for captcha input
    const modal = new ModalBuilder()
      .setCustomId('captcha_modal')
      .setTitle('Enter Verification Code');

    const codeInput = new TextInputBuilder()
      .setCustomId('captcha_code')
      .setLabel('Enter the code shown in the image')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(6)
      .setMaxLength(6);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error showing captcha modal:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while showing the verification form.',
      ephemeral: true 
    });
  }
}

async function handleCaptchaSubmit(interaction: ModalSubmitInteraction) {
  try {
    const code = interaction.fields.getTextInputValue('captcha_code');
    
    // Get verification data from database
    const verification = await knex('verification')
      .where({
        user_id: interaction.user.id,
        guild_id: interaction.guildId,
        verified: false
      })
      .first();

    if (!verification) {
      return await interaction.reply({
        content: '❌ No pending verification found. Please start the verification process again.',
        ephemeral: true
      });
    }

    if (code.toUpperCase() === verification.captcha_code) {
      // Update verification status
      await knex('verification')
        .where('id', verification.id)
        .update({
          verified: true,
          verified_at: new Date()
        });

      // Add verified role
      const guild = interaction.guild;
      if (guild) {
        const member = await guild.members.fetch(interaction.user.id);
        const verifiedRole = guild.roles.cache.find((role: Role) => role.name === 'Verified');
        if (verifiedRole) {
          await member.roles.add(verifiedRole);
        }
      }

      await interaction.reply({
        content: '✅ Verification successful! You now have access to the server.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Invalid verification code. Please try again.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error in captcha submission:', error);
    await interaction.reply({
      content: '❌ An error occurred while verifying your code.',
      ephemeral: true
    });
  }
}