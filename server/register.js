/**
 * Registers the slash commands with Discord. Run once after creating the bot
 * (and whenever commands change): `npm run register`.
 *
 * With DISCORD_GUILD_ID set the commands appear in that guild instantly;
 * without it they register globally (can take up to an hour to propagate).
 */
try {
  process.loadEnvFile(new URL('./.env', import.meta.url));
} catch {
  // no .env — rely on real environment variables
}

import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const { DISCORD_TOKEN: token, DISCORD_CLIENT_ID: clientId, DISCORD_GUILD_ID: guildId } = process.env;
if (!token || !clientId) {
  console.error('register: DISCORD_TOKEN and DISCORD_CLIENT_ID must be set (see README.md)');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('artisan')
    .setDescription('Search artisan keycap colorways')
    .addStringOption((o) =>
      o.setName('query').setDescription('Colorway, sculpt, or maker name').setRequired(true).setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName('maker')
    .setDescription('Find a maker and their links')
    .addStringOption((o) =>
      o.setName('query').setDescription('Maker name').setRequired(true).setAutocomplete(true)
    ),
].map((c) => c.toJSON());

const rest = new REST().setToken(token);
const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);
await rest.put(route, { body: commands });
console.log(`registered ${commands.length} commands ${guildId ? `in guild ${guildId}` : 'globally'}`);
