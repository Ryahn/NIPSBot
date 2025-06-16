import { Client, GatewayIntentBits, Collection, RateLimitData } from 'discord.js'
import { config } from './config/env'
import { initializeDatabase, verifyModelConnection, shutdownDatabase } from './database/db'
import { loadCommands } from './utils/commandHandler'
import { loadEvents } from './utils/eventHandler'
import Logger from './utils/logger'

// Extend the Client class to include commands
class CustomClient extends Client {
  commands: Collection<string, any>
  commandCooldowns: Map<string, Map<string, number>>
  
  constructor(options: any) {
    super(options)
    this.commands = new Collection()
    this.commandCooldowns = new Map()
  }

  // Add rate limiting for commands
  isOnCooldown(commandName: string, userId: string, cooldownSeconds: number): boolean {
    if (!this.commandCooldowns.has(commandName)) {
      this.commandCooldowns.set(commandName, new Map())
    }

    const timestamps = this.commandCooldowns.get(commandName)!
    const now = Date.now()
    const cooldownAmount = cooldownSeconds * 1000

    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId)! + cooldownAmount

      if (now < expirationTime) {
        return true
      }
    }

    timestamps.set(userId, now)
    setTimeout(() => timestamps.delete(userId), cooldownAmount)
    return false
  }
}

const client = new CustomClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  })
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  })
})

// Handle rate limit events
client.on('rateLimit', (rateLimitData: RateLimitData) => {
  Logger.warn('Rate limit hit', {
    limit: rateLimitData.limit,
    method: rateLimitData.method,
    route: rateLimitData.route
  })
})

// Handle API errors
client.on('error', (error) => {
  Logger.error('Discord API error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  })
})

// Handle websocket errors
client.on('shardError', (error) => {
  Logger.error('Websocket error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  })
})

async function startBot() {
  try {
    Logger.info('Starting bot initialization')
    await initializeDatabase()
    await verifyModelConnection()
    await loadEvents(client)
    await loadCommands(client)
    
    Logger.info('Attempting to login to Discord')
    await client.login(config.discord.token)
  } catch (error) {
    Logger.error('Bot startup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    await shutdownDatabase()
    process.exit(1)
  }
}

// Handle graceful shutdown
async function shutdown() {
  Logger.info('Shutting down bot')
  try {
    await client.destroy()
    await shutdownDatabase()
    Logger.info('Bot shutdown complete')
  } catch (error) {
    Logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Start the bot
startBot() 