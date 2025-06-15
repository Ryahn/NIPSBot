import { SlashCommandBuilder, CommandInteraction } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with bot latency')

export async function execute(interaction: CommandInteraction) {
  await interaction.reply({ content: 'Pinging...' })
  const sent = await interaction.fetchReply()
  const latency = sent.createdTimestamp - interaction.createdTimestamp
  
  await interaction.editReply(`🏓 Pong!\nLatency: ${latency}ms\nAPI Latency: ${Math.round(interaction.client.ws.ping)}ms`)
} 