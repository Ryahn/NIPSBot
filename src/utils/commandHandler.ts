import { Collection, REST, Routes, SlashCommandBuilder } from 'discord.js'
import { config } from '../config/env'
import fs from 'fs'
import path from 'path'

async function loadCommandsRecursively(dir: string): Promise<{ commands: Collection<string, any>, commandsArray: SlashCommandBuilder[] }> {
  const commands: Collection<string, any> = new Collection()
  const commandsArray: SlashCommandBuilder[] = []
  
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
      const command = require(filePath)
      
      if ('data' in command && 'execute' in command) {
        commands.set(command.data.name, command)
        commandsArray.push(command.data.toJSON())
      } else {
        console.log(`⚠️ Command at ${filePath} is missing required properties`)
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
    
    console.log('🔄 Started refreshing application (/) commands')
    
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commandsArray }
    )
    
    console.log('✅ Successfully reloaded application (/) commands')
    
    client.commands = commands
  } catch (error) {
    console.error('❌ Error loading commands:', error)
  }
} 