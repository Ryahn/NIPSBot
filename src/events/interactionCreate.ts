import { Events, Interaction, ButtonInteraction, TextChannel, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalSubmitInteraction, ButtonBuilder, ButtonStyle, DiscordAPIError, MessageFlags } from 'discord.js';
import { models } from '../database/models';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction) {
  if (interaction.isButton()) {
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
    const guildId = interaction.guildId;
    if (!guildId) {
      return await interaction.reply({ content: '❌ This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    }

    // Get verification settings
    const settings = await models.VerificationSettings.query()
      .where('guild_id', guildId)
      .first();

    const timeout = settings?.verification_timeout || 300;
    const reminderTime = settings?.reminder_time || 60;

    // Create verification record
    const verification = await models.Verification.query().insert({
      user_id: interaction.user.id,
      captcha_code: generateCaptcha(),
      verified: false
    });

    // Send verification message
    const embed = new EmbedBuilder()
      .setTitle('Verification Required')
      .setDescription(`Please enter the following code to verify yourself:\n\n**${verification.captcha_code}**\n\nYou have ${timeout} seconds to complete this verification.`)
      .setColor('#0099ff');

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verify_captcha')
          .setLabel('Enter Code')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });

    // Set up reminder timer
    const reminderTimeout = setTimeout(async () => {
      try {
        const verificationStatus = await models.Verification.query()
          .where('id', verification.id)
          .first();

        if (verificationStatus && !verificationStatus.verified) {
          try {
            await interaction.followUp({
              content: `⚠️ Your verification will expire in ${reminderTime} seconds! Please complete the verification soon.`,
              flags: MessageFlags.Ephemeral
            });
          } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 10062) {
              // Interaction expired, clean up the verification
              await models.Verification.query()
                .where('id', verification.id)
                .delete();
            }
            console.error('Error sending reminder:', error);
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    }, (timeout - reminderTime) * 1000);

    // Set up expiration timer
    const expirationTimeout = setTimeout(async () => {
      try {
        const verificationStatus = await models.Verification.query()
          .where('id', verification.id)
          .first();

        if (verificationStatus && !verificationStatus.verified) {
          await models.Verification.query()
            .where('id', verification.id)
            .delete();

          try {
            await interaction.followUp({
              content: '❌ Verification expired. Please try again.',
              flags: MessageFlags.Ephemeral
            });
          } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 10062) {
              // Interaction expired, just log it
              console.log('Verification expired for user:', interaction.user.id);
            } else {
              console.error('Error sending expiration message:', error);
            }
          }

          // Log the timeout if log channel is set
          if (settings?.log_channel_id) {
            try {
              const logChannel = await interaction.guild?.channels.fetch(settings.log_channel_id) as TextChannel;
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setTitle('Verification Timeout')
                  .setDescription(`User ${interaction.user} failed to verify within the time limit.`)
                  .setColor('#ff0000')
                  .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
              }
            } catch (error) {
              console.error('Error sending log message:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error handling verification expiration:', error);
      }
    }, timeout * 1000);

    // Clean up timers when verification is completed
    const cleanup = () => {
      clearTimeout(reminderTimeout);
      clearTimeout(expirationTimeout);
    };

    // Store cleanup function for later use
    (interaction as any).verificationCleanup = cleanup;
  } catch (error) {
    console.error('Error in verification handler:', error);
    try {
      await interaction.reply({ content: '❌ An error occurred during verification.', flags: MessageFlags.Ephemeral });
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

async function handleCaptchaVerification(interaction: ButtonInteraction) {
  try {
    // Check if verification is still valid
    const verification = await models.Verification.query()
      .where({
        user_id: interaction.user.id,
        verified: false
      })
      .first();

    if (!verification) {
      return await interaction.reply({
        content: '❌ No pending verification found. Please start the verification process again.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Create modal for captcha input
    const modal = new ModalBuilder()
      .setCustomId('captcha_modal')
      .setTitle('Enter Verification Code');

    const codeInput = new TextInputBuilder()
      .setCustomId('captcha_code')
      .setLabel('Enter the code shown above')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(6)
      .setMaxLength(6);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error showing captcha modal:', error);
    try {
      await interaction.reply({ 
        content: '❌ An error occurred while showing the verification form.',
        flags: MessageFlags.Ephemeral
      });
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

async function handleCaptchaSubmit(interaction: ModalSubmitInteraction) {
  try {
    const code = interaction.fields.getTextInputValue('captcha_code');
    
    // Get verification data from database
    const verification = await models.Verification.query()
      .where({
        user_id: interaction.user.id,
        verified: false
      })
      .first();

    if (!verification) {
      return await interaction.reply({
        content: '❌ No pending verification found. Please start the verification process again.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (code.toUpperCase() === verification.captcha_code) {
      // Update verification status
      await models.Verification.query()
        .where('id', verification.id)
        .patch({
          verified: true
        });

      // Get verification settings for logging
      const settings = await models.VerificationSettings.query()
        .where('guild_id', interaction.guildId)
        .first();

      // Log successful verification if log channel is set
      if (settings?.log_channel_id) {
        try {
          const logChannel = await interaction.guild?.channels.fetch(settings.log_channel_id) as TextChannel;
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('Verification Successful')
              .setDescription(`User ${interaction.user} has successfully verified.`)
              .setColor('#00ff00')
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (error) {
          console.error('Error sending log message:', error);
        }
      }

      try {
        await interaction.reply({
          content: '✅ Verification successful! You now have access to the server.',
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        if (error instanceof DiscordAPIError && error.code === 10062) {
          console.log('Verification successful but interaction expired for user:', interaction.user.id);
        } else {
          console.error('Error sending success message:', error);
        }
      }

      // Clean up timers if they exist
      if ((interaction as any).verificationCleanup) {
        (interaction as any).verificationCleanup();
      }
    } else {
      try {
        await interaction.reply({
          content: '❌ Invalid verification code. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        if (error instanceof DiscordAPIError && error.code === 10062) {
          console.log('Invalid code attempt but interaction expired for user:', interaction.user.id);
        } else {
          console.error('Error sending invalid code message:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error in captcha submission:', error);
    try {
      await interaction.reply({
        content: '❌ An error occurred while verifying your code.',
        flags: MessageFlags.Ephemeral
      });
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

function generateCaptcha(): string {
  // Generate a random 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}