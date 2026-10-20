import {
  getSettings,
  saveSettings,
  normalizeApiUrl,
  normalizeApiKey,
  USERS,
} from '../lib/settings.js';

const $ = (id) => document.getElementById(id);
const els = {
  form: $('form'),
  apiUrl: $('api-url'),
  apiKey: $('api-key'),
  user: $('default-user'),
  save: $('save'),
  test: $('test'),
  status: $('status'),
};

function showStatus(kind, text) {
  els.status.hidden = !text;
  els.status.className = 'status ' + kind;
  els.status.textContent = text || '';
}

// Reads and validates the form; throws an Error with a user-facing message.
function readForm() {
  return {
    apiUrl: normalizeApiUrl(els.apiUrl.value),
    apiKey: normalizeApiKey(els.apiKey.value),
    defaultUser: els.user.value,
  };
}

// Hosts outside host_permissions (a custom domain) get requested at runtime.
// Best effort: the backend also allows cross-origin calls, so a "no" is not fatal.
// Must be called first in the click handler to keep the user-gesture.
async function requestHostAccess(apiUrl) {
  try {
    const { protocol, hostname } = new URL(apiUrl);
    return await chrome.permissions.request({ origins: [protocol + '//' + hostname + '/*'] });
  } catch (e) {
    return false;
  }
}

async function onSave(event) {
  event.preventDefault();
  let values;
  try {
    values = readForm();
  } catch (e) {
    showStatus('bad', e.message);
    return;
  }

  els.save.disabled = true;
  const granted = await requestHostAccess(values.apiUrl);
  try {
    await saveSettings(values);
  } catch (e) {
    showStatus('bad', 'Could not save settings: ' + ((e && e.message) || 'unknown error'));
    els.save.disabled = false;
    return;
  }
  els.apiUrl.value = values.apiUrl; // show the cleaned-up URL
  els.apiKey.value = values.apiKey;
  els.save.disabled = false;
  showStatus(
    granted ? 'ok' : 'warn',
    granted
      ? 'Settings saved.'
      : 'Settings saved. Browser access to this address was not granted; saving jobs will still work if the backend allows it. Use Test connection to check.'
  );
}

async function onTest() {
  let values;
  try {
    values = readForm();
  } catch (e) {
    showStatus('bad', e.message);
    return;
  }

  els.test.disabled = true;
  showStatus('pending', 'Testing… a sleeping server can take up to a minute to answer.');
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: 'ping',
      settings: { apiUrl: values.apiUrl, apiKey: values.apiKey },
    });
  } catch (e) {
    response = { ok: false, error: (e && e.message) || 'Could not reach the extension background.' };
  }
  els.test.disabled = false;

  if (!response || !response.ok) {
    showStatus('bad', (response && response.error) || 'No response from the extension background.');
    return;
  }
  const { authRequired, authorized, apiVersion } = response.result;
  if (authRequired && !authorized) {
    showStatus(
      'warn',
      values.apiKey
        ? 'Reached the server, but it rejected this API key.'
        : 'Reached the server, but it requires an API key. Enter it above.'
    );
    return;
  }
  showStatus(
    'ok',
    'Connected' + (apiVersion ? ' (API v' + apiVersion + ')' : '') + (authRequired ? ', API key accepted.' : '.')
  );
}

async function init() {
  USERS.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    els.user.appendChild(option);
  });
  const settings = await getSettings();
  els.apiUrl.value = settings.apiUrl;
  els.apiKey.value = settings.apiKey;
  els.user.value = settings.defaultUser;

  els.form.addEventListener('submit', onSave);
  els.test.addEventListener('click', onTest);
}

init().catch((e) => showStatus('bad', (e && e.message) || 'Could not load settings.'));
