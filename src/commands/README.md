# Discord Bot Commands

This directory contains all the bot's slash commands organized into subfolders by category.

## Command Categories

- `admin/` - Administrative commands (server settings, bot configuration)
- `mod/` - Moderation commands (kick, ban, mute, etc.)
- `misc/` - Miscellaneous utility commands (ping, help, etc.)
- `utils/` - General utility commands (user info, server info, etc.)

## Adding New Commands

To add a new command:

1. Create a new TypeScript file in the appropriate category folder
2. Export a `data` property with the command definition using `SlashCommandBuilder`
3. Export an `execute` function that handles the command logic

Example command structure:
```typescript
import { SlashCommandBuilder, CommandInteraction } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('commandname')
  .setDescription('Command description')

export async function execute(interaction: CommandInteraction) {
  // Command logic here
}
```

## Command Categories

### Admin Commands
Commands for server administrators to manage bot settings and server configuration.

### Mod Commands
Commands for moderators to manage users and content.

### Misc Commands
General utility commands that don't fit into other categories.

### Utils Commands
Utility commands for getting information about users, server, etc. 