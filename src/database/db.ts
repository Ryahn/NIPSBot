import Knex from 'knex'
import { Model } from 'objection'
import { config } from '../config/env'
import { models } from './models'
import path from 'path'
import Logger from '../utils/logger'

export const knex = Knex({
  client: 'pg',
  connection: config.database.connection,
  pool: {
    min: 2,
    max: 10,
    createTimeoutMillis: 3000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
    propagateCreateError: false
  },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts'
  },
  log: {
    warn(message) {
      Logger.warn('Database warning', { message });
    },
    error(message) {
      Logger.error('Database error', { message });
    },
    deprecate(message) {
      Logger.warn('Database deprecation', { message });
    },
    debug(message) {
      Logger.debug('Database debug', { message });
    }
  }
})

// Initialize Objection with Knex
Model.knex(knex)

// Graceful shutdown function
export async function shutdownDatabase(): Promise<void> {
  try {
    Logger.info('Shutting down database connection pool');
    await knex.destroy();
    Logger.info('Database connection pool closed');
  } catch (error) {
    Logger.error('Error shutting down database connection pool', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    Logger.info('Attempting to connect to database');
    await knex.raw('SELECT 1')
    Logger.info('Database connection established')
    
    // Run migrations on startup
    Logger.info('Running database migrations');
    await knex.migrate.latest()
    Logger.info('Database migrations completed')
    
    // Verify model connection
    await verifyModelConnection()

    // Set up graceful shutdown
    process.on('SIGTERM', async () => {
      Logger.info('SIGTERM received, shutting down gracefully');
      await shutdownDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      Logger.info('SIGINT received, shutting down gracefully');
      await shutdownDatabase();
      process.exit(0);
    });
  } catch (error) {
    Logger.error('Database initialization failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      connectionString: config.database.connection.replace(/:[^:@]*@/, ':****@') // Hide password in logs
    })
    process.exit(1)
  }
}

// Function to verify model connection
export async function verifyModelConnection(): Promise<void> {
  try {
    Logger.debug('Verifying model connection');
    // Test query using one of the models
    await models.AllianceMembers.query().limit(1)
    Logger.info('Model connection verified')
  } catch (error) {
    Logger.error('Model connection verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

// Export models for use throughout the application
export { models } 