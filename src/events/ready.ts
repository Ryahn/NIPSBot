import { Events, Client } from 'discord.js'
import Logger from '../utils/logger'

export const name = Events.ClientReady
export const once = true

export async function execute(client: Client) {
  try {
    Logger.info('Bot is ready and logged in', {
      tag: client.user?.tag,
      id: client.user?.id,
      guilds: client.guilds.cache.size
    })

    // Log guild information
    for (const guild of client.guilds.cache.values()) {
      Logger.info('Connected to guild', {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        channels: guild.channels.cache.size,
        roles: guild.roles.cache.size
      })
    }

    // Set bot status
    await client.user?.setPresence({
      activities: [{ name: 'with commands | /help', type: 0 }],
      status: 'online'
    })

    Logger.info('Bot presence set')
  } catch (error) {
    Logger.error('Error in ready event handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
} 