import dotenv from 'dotenv'
dotenv.config()

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!,
    guildId: process.env.DISCORD_GUILD_ID!
  },
  database: {
    connection: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bot'
  },
  roles: {
    member: process.env.MEMBER_ROLE_NAME || 'Member',
    friend: process.env.FRIEND_ROLE_NAME || 'Friend',
    allianceMember: process.env.ALLIANCE_MEMBER_ROLE_NAME || 'Alliance Member'
  }
} 