import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const params = new URLSearchParams({
  grant_type: 'refresh_token',
  client_id: process.env.ZOHO_CLIENT_ID,
  client_secret: process.env.ZOHO_CLIENT_SECRET,
  refresh_token: process.env.ZOHO_REFRESH_TOKEN,
});
const tokenRes = await fetch('https://accounts.zoho.com/oauth/v2/token', { method: 'POST', body: params });
const tokenData = await tokenRes.json();
console.log('[token]', tokenData);
const { access_token } = tokenData;

// Get all mailing lists and their keys
const listsRes = await fetch(
  `https://campaigns.zoho.com/api/v1.1/getmailinglists?resfmt=JSON&range=10&fromindex=1`,
  { headers: { Authorization: `Zoho-oauthtoken ${access_token}` } }
);
const listsData = await listsRes.json();
console.log('[mailing lists]', JSON.stringify(listsData, null, 2));
