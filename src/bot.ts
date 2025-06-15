import { Client, GatewayIntentBits, Collection } from 'discord.js'
import { config } from './config/env'
import { initializeDatabase, verifyModelConnection } from './database/db'
import { loadCommands } from './utils/commandHandler'
import { loadEvents } from './utils/eventHandler'

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
    console.log('🤖 Bot is ready!')
  } catch (error) {
    console.error('❌ Bot startup failed:', error)
    process.exit(1)
  }
}

startBot() 