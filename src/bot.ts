import { Client, GatewayIntentBits, Collection } from 'discord.js'
import { config } from './config/env'
import { initializeDatabase, verifyModelConnection } from './database/db'
import { loadCommands } from './utils/commandHandler'
import { loadEvents } from './utils/eventHandler'
import Logger from './utils/logger'

// Extend the Client class to include commands
class CustomClient extends Client {
  commands: Collection<string, any>
  
  constructor(options: any) {
    super(options)
    this.commands = new Collection()
  }
}

const client = new CustomClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
})

async function startBot() {
  try {
    await initializeDatabase()
    await verifyModelConnection()
    await loadEvents(client)
    await loadCommands(client)
    await client.login(config.discord.token)
    Logger.info('Bot is ready!')
  } catch (error) {
    Logger.error('Bot startup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

startBot() 