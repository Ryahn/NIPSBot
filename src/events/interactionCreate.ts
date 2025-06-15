import { Events, Interaction } from 'discord.js'
import type { Client } from 'discord.js'

export const name = Events.InteractionCreate
export const once = false

export async function execute(interaction: Interaction) {
  const client = interaction.client as Client & { commands: Map<string, any> }

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

      // Only ChatInputCommandInteraction supports reply/followUp
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
  }
} 