/**
 * Discord bot: /artisan and /maker slash commands with autocomplete.
 *
 *   /artisan query:<text>  pick a colorway from autocomplete for its full
 *                          card, or submit free text: ≤10 results get the
 *                          CapBot-style linked list + image grid, more get a
 *                          compact list.
 *   /maker query:<text>    maker card (links, counts) or a list of matches.
 *
 * Commands are registered by register.js (`npm run register`).
 * Loads DISCORD_TOKEN etc. from .env in this folder when present.
 */
try {
  process.loadEnvFile(new URL('./.env', import.meta.url));
} catch {
  // no .env — rely on real environment variables
}

import { Client, Events, GatewayIntentBits } from 'discord.js';
import {
  loadCatalog,
  watchCatalog,
  getState,
  searchColorways,
  searchMakers,
} from './catalog.js';
import {
  colorwayEmbeds,
  resultsEmbeds,
  listEmbeds,
  makerEmbeds,
  makerListEmbeds,
} from './embeds.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('bot: DISCORD_TOKEN not set (see README.md) — exiting');
  process.exit(1);
}

await loadCatalog();
watchCatalog();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => console.log(`bot: logged in as ${c.user.tag}`));

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isAutocomplete()) return await onAutocomplete(interaction);
    if (interaction.isChatInputCommand()) return await onCommand(interaction);
  } catch (err) {
    console.error('interaction error:', err);
    const msg = { content: 'Something went wrong — try again.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(msg);
    else if (!interaction.isAutocomplete()) await interaction.reply(msg);
  }
});

// Autocomplete must answer within 3s; the in-memory index is sub-ms.
async function onAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  const q = String(focused.value ?? '');
  let choices;
  if (interaction.commandName === 'artisan') {
    choices = searchColorways(q, 25).results.map((cw) => ({
      name: `${cw.maker} ${cw.sculpt} ${cw.name}`.slice(0, 100),
      value: cw.id,
    }));
  } else if (interaction.commandName === 'maker') {
    choices = searchMakers(q, 25).results.map((m) => ({
      name: m.name.slice(0, 100),
      value: m.id,
    }));
  }
  await interaction.respond(choices ?? []);
}

async function onCommand(interaction) {
  const q = interaction.options.getString('query', true).trim();

  if (interaction.commandName === 'artisan') {
    // An autocomplete pick arrives as the exact colorway id.
    const picked = getState().byId.get(q);
    if (picked) return void (await interaction.reply({ embeds: colorwayEmbeds(picked) }));

    const { total, results } = searchColorways(q, 25);
    if (total === 0) {
      return void (await interaction.reply({
        content: `No colorways match "${q}".`,
        ephemeral: true,
      }));
    }
    if (total === 1) return void (await interaction.reply({ embeds: colorwayEmbeds(results[0]) }));
    if (total <= 10) {
      return void (await interaction.reply({ embeds: resultsEmbeds(q, results.slice(0, 10), total) }));
    }
    return void (await interaction.reply({ embeds: listEmbeds(q, results, total) }));
  }

  if (interaction.commandName === 'maker') {
    const picked = getState().makerById.get(q);
    if (picked) return void (await interaction.reply({ embeds: makerEmbeds(picked) }));

    const { total, results } = searchMakers(q, 10);
    if (total === 0) {
      return void (await interaction.reply({ content: `No makers match "${q}".`, ephemeral: true }));
    }
    if (total === 1) return void (await interaction.reply({ embeds: makerEmbeds(results[0]) }));
    return void (await interaction.reply({ embeds: makerListEmbeds(q, results, total) }));
  }
}

client.login(token);
