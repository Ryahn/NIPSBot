require('dotenv').config()

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bot',
    migrations: {
      directory: './src/database/migrations'
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bot',
    migrations: {
      directory: './src/database/migrations'
    }
  }
} 