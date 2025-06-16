import { Collection, REST, Routes, SlashCommandBuilder, CommandInteraction, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js'
import { config } from '../config/env'
import fs from 'fs'
import path from 'path'
import Logger from './logger'

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
  cooldown?: number; // Cooldown in seconds
}

async function loadCommandsRecursively(dir: string): Promise<{ commands: Collection<string, Command>, commandsArray: RESTPostAPIApplicationCommandsJSONBody[] }> {
  const commands: Collection<string, Command> = new Collection()
  const commandsArray: RESTPostAPIApplicationCommandsJSONBody[] = []
  
  const files = fs.readdirSync(dir)
  
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      // Recursively load commands from subdirectories
      const { commands: subCommands, commandsArray: subCommandsArray } = await loadCommandsRecursively(filePath)
      subCommands.forEach((cmd, name) => {
        commands.set(name, cmd)
      })
      commandsArray.push(...subCommandsArray)
    } else if (file.endsWith('.ts')) {
      try {
        const command = require(filePath) as Command
        
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command)
          commandsArray.push(command.data.toJSON())
        } else {
          Logger.warn('Command missing required properties', { filePath })
        }
      } catch (error) {
        Logger.error('Error loading command', {
          filePath,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })
      }
    }
  }
  
  return { commands, commandsArray }
}

export async function loadCommands(client: any) {
  const commandsPath = path.join(__dirname, '..', 'commands')
  
  try {
    const { commands, commandsArray } = await loadCommandsRecursively(commandsPath)
    
    // Register commands with Discord
    const rest = new REST().setToken(config.discord.token)
    
    Logger.info('Started refreshing application (/) commands')
    
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commandsArray }
    )
    
    Logger.info('Successfully reloaded application (/) commands')
    
    client.commands = commands

    // Set up command handler
    client.on('interactionCreate', async (interaction: CommandInteraction) => {
      if (!interaction.isCommand()) return

      const command = commands.get(interaction.commandName)
      if (!command) return

      try {
        // Check for cooldown
        if (command.cooldown && client.isOnCooldown(command.data.name, interaction.user.id, command.cooldown)) {
          const remainingTime = Math.ceil(
            (client.commandCooldowns.get(command.data.name)!.get(interaction.user.id)! + command.cooldown * 1000 - Date.now()) / 1000
          )
          return await interaction.reply({
            content: `Please wait ${remainingTime} seconds before using this command again.`,
            ephemeral: true
          })
        }

        await command.execute(interaction)
      } catch (error) {
        Logger.error('Error executing command', {
          command: interaction.commandName,
          userId: interaction.user.id,
          guildId: interaction.guildId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })

        try {
          const reply = interaction.replied || interaction.deferred
            ? interaction.followUp
            : interaction.reply

          await reply({
            content: 'There was an error executing this command.',
            ephemeral: true
          })
        } catch (replyError) {
          Logger.error('Error sending error message', {
            error: replyError instanceof Error ? replyError.message : 'Unknown error',
            stack: replyError instanceof Error ? replyError.stack : undefined
          })
        }
      }
    })
  } catch (error) {
    Logger.error('Error loading commands', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
} 