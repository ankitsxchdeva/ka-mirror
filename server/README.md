# ka-mirror server

JSON API and Discord bot for the keycap catalog. Reads the same
`data/catalog.json` the static site builds from and hot-reloads when the
file changes — point a daily cron at `scripts/fetch-data.mjs` (repo root)
and this stays fresh with no restarts.

```
node >= 22.12
npm install
```

## API

```sh
npm run api        # listens on :8484 (PORT env)
```

| Route | Description |
| --- | --- |
| `GET /api/stats` | Catalog counts |
| `GET /api/search?q=smoko&limit=25` | Colorway search (limit max 100) |
| `GET /api/colorway/:id` | One colorway, full detail |
| `GET /api/makers?q=bogan` | Maker search with links |
| `GET /api/maker/:slug` | One maker with sculpt list |

CORS is open (`*`) and responses carry `Cache-Control: public, max-age=300`.

## Discord bot

Slash commands with autocomplete (no privileged intents needed):

- `/artisan query:` — pick from autocomplete for a full colorway card, or
  submit free text: ≤10 results get a linked list + thumbnail grid, more get
  a compact list with "showing X of N".
- `/maker query:` — maker card with Instagram/website/Discord/catalog links
  and sculpt/colorway counts.

### Setup

1. [Discord Developer Portal](https://discord.com/developers/applications) →
   **New Application** → **Bot** → copy the token.
2. **OAuth2 → URL Generator** → scopes `bot` + `applications.commands` →
   invite the bot to your server with the generated URL.
3. `cp .env.example .env`, fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`
   (the application's **Application ID**). Set `DISCORD_GUILD_ID` to your
   server ID while testing — guild commands appear instantly; global
   registration can take up to an hour.
4. `npm run register` — one-time slash-command registration.
5. `npm start` — API + bot in one process (`npm run bot` for bot only).

### Keeping data fresh

```cron
0 4 * * *  cd /path/to/ka-mirror && node scripts/fetch-data.mjs
```

The server watches `data/catalog.json` and rebuilds its index on change.
Set `KA_DATA` to point at a catalog file elsewhere, and `SITE_URL` if the
site lives on a different domain (used for links in bot replies).
