import { Client } from 'discord.js'
import fs from 'fs'
import path from 'path'
import Logger from './logger'

export async function loadEvents(client: Client) {
  const eventsPath = path.join(__dirname, '..', 'events')
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts'))
  
  for (const file of eventFiles) {
    try {
      const filePath = path.join(eventsPath, file)
      const event = require(filePath)
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args))
      } else {
        client.on(event.name, (...args) => event.execute(...args))
      }
      
      Logger.info('Loaded event', { name: event.name })
    } catch (error) {
      Logger.error('Error loading event', {
        file,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }
} 