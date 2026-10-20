// Extension settings, kept in chrome.storage.local (not sync: the API key is a
// secret and should not be copied to every device signed in to the profile).

export const USERS = ['Madhav', 'Veena', 'Vandhana'];

export const DEFAULT_SETTINGS = Object.freeze({
  apiUrl: 'http://localhost:8000',
  apiKey: '',
  defaultUser: 'Madhav',
});

/** Returns a clean base URL (no trailing slash, query or hash) or throws an Error with a user-facing message. */
export function normalizeApiUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch (e) {
    throw new Error('Enter a full URL such as https://your-app.onrender.com');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The API URL must start with http:// or https://');
  }
  return url.origin + url.pathname.replace(/\/+$/, '');
}

/** Returns the trimmed key or throws. HTTP headers can only carry printable ASCII reliably. */
export function normalizeApiKey(raw) {
  const key = String(raw || '').trim();
  if (/[^\x21-\x7E]/.test(key)) {
    throw new Error('The API key may only contain letters, digits and symbols (no spaces or accents).');
  }
  return key;
}

export async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return {
    apiUrl: stored.apiUrl || DEFAULT_SETTINGS.apiUrl,
    apiKey: stored.apiKey || '',
    defaultUser: USERS.includes(stored.defaultUser) ? stored.defaultUser : DEFAULT_SETTINGS.defaultUser,
  };
}

export async function saveSettings(partial) {
  await chrome.storage.local.set(partial);
}
