# OnlyShips Discord Bot

A Discord bot for role and channel management using Discord.js, Knex, Objection, and SQLite.

## Project Structure

```
src/
  bot.ts            # Main bot entry point
  config/
    env.ts          # Environment variable loader and config
  database/
    db.ts           # Database connection and initialization
  types/
    discord.d.ts    # Discord.js type extensions
```

## Configuration

Create a `.env` file in the project root with the following variables:

```
DISCORD_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_GUILD_ID=your-guild-id-here
DATABASE_URL=./data/bot.db
MEMBER_ROLE_NAME=Member
FRIEND_ROLE_NAME=Friend
ALLIANCE_MEMBER_ROLE_NAME=Alliance Member
```

## Database
- Uses SQLite by default (file: `./data/bot.db`)
- Knex and Objection handle migrations and models

## Setup
1. Install dependencies: `npm install`
2. Configure your `.env` file
3. Run the bot: `npx ts-node src/bot.ts` 