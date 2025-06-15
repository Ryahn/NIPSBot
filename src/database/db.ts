import Knex from 'knex'
import { Model } from 'objection'
import { config } from '../config/env'
import { models } from './models'
import path from 'path'

export const knex = Knex({
  client: 'pg',
  connection: config.database.connection,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts'
  }
})

// Initialize Objection with Knex
Model.knex(knex)

export async function initializeDatabase(): Promise<void> {
  try {
    await knex.raw('SELECT 1')
    console.log('✅ Database connection established')
    // Run migrations on startup
    await knex.migrate.latest()
    console.log('✅ Database migrations completed')
    
    // Verify model connection
    await verifyModelConnection()
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

// Function to verify model connection
export async function verifyModelConnection(): Promise<void> {
  try {
    // Test query using one of the models
    await models.AllianceMembers.query().limit(1)
    console.log('✅ Model connection verified')
  } catch (error) {
    console.error('❌ Model connection verification failed:', error)
    throw error
  }
}

// Export models for use throughout the application
export { models } 