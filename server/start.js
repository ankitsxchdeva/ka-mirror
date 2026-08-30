/**
 * Runs the API and Discord bot in one process (`npm start`).
 * Use `npm run api` if you only want the HTTP API.
 */
import { loadCatalog, watchCatalog } from './catalog.js';
import { startApi } from './api.js';

await loadCatalog();
watchCatalog();
startApi();
await import('./bot.js');
