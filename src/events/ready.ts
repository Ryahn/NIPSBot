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
  } catch (error) {
    Logger.error('Error in ready event handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
} 