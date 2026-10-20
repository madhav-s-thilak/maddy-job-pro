// Service worker. Owns every network call so a save still completes if the
// popup closes mid-request, and handles the right-click "Save job" shortcut.
// All listeners are registered at the top level, as MV3 service workers require.

import { getSettings } from './lib/settings.js';
import { ingestJob, pingServer, buildPayload } from './lib/api.js';
import { extractJobFromPage } from './lib/extractor.js';

const MENU_ID = 'save-job-to-tracker';

const BADGE = {
  busy: { text: '...', color: '#64748b' },
  saved: { text: '✓', color: '#16a34a' },
  duplicate: { text: 'dup', color: '#d97706' },
  unsure: { text: '?', color: '#d97706' },
  error: { text: '!', color: '#dc2626' },
};

// Tab-scoped badge: Chrome clears it by itself when the tab navigates.
async function setBadge(tabId, kind, title) {
  if (!Number.isInteger(tabId)) return;
  const { text, color } = BADGE[kind];
  try {
    await chrome.action.setBadgeText({ tabId, text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    await chrome.action.setTitle({ tabId, title: title || 'Save this job to Job Tracker' });
  } catch (e) {
    /* the tab was closed before we could update it */
  }
}

function badgeForResult(tabId, result) {
  if (result.status === 'saved') return setBadge(tabId, 'saved', 'Saved to Job Tracker');
  return setBadge(tabId, 'duplicate', 'Already in Job Tracker');
}

chrome.runtime.onInstalled.addListener((details) => {
  // removeAll first: onInstalled also fires on updates and would otherwise hit a duplicate-id error.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      { id: MENU_ID, title: 'Save job to Job Tracker', contexts: ['page', 'selection'] },
      () => void chrome.runtime.lastError
    );
  });
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});

// Right-click save: no preview, so it only saves when the page was read confidently.
async function quickSave(tab) {
  await setBadge(tab.id, 'busy', 'Saving...');
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractJobFromPage,
  });
  const page = injection && injection.result;
  if (!page || !page.confident) {
    await setBadge(
      tab.id,
      'unsure',
      "Couldn't detect the job on this page. Click the extension icon to fill it in."
    );
    return;
  }
  const settings = await getSettings();
  const result = await ingestJob(settings, buildPayload(page, settings.defaultUser));
  await badgeForResult(tab.id, result);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || !Number.isInteger(tab.id)) return;
  quickSave(tab).catch((err) => {
    console.error('Job Tracker quick save failed:', err);
    setBadge(tab.id, 'error', 'Job Tracker: ' + ((err && err.message) || 'save failed'));
  });
});

async function handleMessage(msg) {
  if (msg.type === 'ping') {
    // The options page may test values that are not saved yet.
    const stored = await getSettings();
    const settings = msg.settings ? { ...stored, ...msg.settings } : stored;
    return { ok: true, result: await pingServer(settings) };
  }

  // msg.type === 'ingest'
  try {
    const settings = await getSettings();
    const result = await ingestJob(settings, msg.payload);
    await badgeForResult(msg.tabId, result);
    return { ok: true, result };
  } catch (err) {
    await setBadge(msg.tabId, 'error', 'Job Tracker: ' + ((err && err.message) || 'save failed'));
    throw err;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || (msg.type !== 'ping' && msg.type !== 'ingest')) return false;
  handleMessage(msg).then(sendResponse, (err) =>
    sendResponse({
      ok: false,
      error: (err && err.message) || 'Unexpected error',
      kind: (err && err.kind) || 'unknown',
    })
  );
  return true; // keep the channel open for the async response
});
