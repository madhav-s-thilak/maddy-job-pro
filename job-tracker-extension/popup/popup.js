// Popup: reads the current tab, lets the user review/edit, then asks the
// background worker to save. Page text is only ever written to .value /
// .textContent, never innerHTML.

import { getSettings, saveSettings, USERS } from '../lib/settings.js';
import { extractJobFromPage } from '../lib/extractor.js';
import { buildPayload } from '../lib/api.js';

const $ = (id) => document.getElementById(id);
const els = {
  user: $('user'),
  company: $('company'),
  role: $('role'),
  location: $('location'),
  salary: $('salary'),
  link: $('jd-link'),
  description: $('description'),
  descCount: $('desc-count'),
  source: $('source'),
  save: $('save'),
  result: $('result'),
  notice: $('notice'),
  connDot: $('conn-dot'),
  connText: $('conn-text'),
  form: $('form'),
};

let activeTab = null;
let sourceSite = '';

function setConnection(state, text) {
  els.connDot.className = 'dot ' + state;
  els.connText.textContent = text;
  els.connText.title = text;
}

function showNotice(text) {
  els.notice.hidden = !text;
  els.notice.className = 'notice info';
  els.notice.textContent = text || '';
}

function showResult(kind, text) {
  els.result.hidden = !text;
  els.result.className = 'result ' + kind;
  els.result.textContent = text || '';
}

function updateDescCount() {
  const n = els.description.value.length;
  els.descCount.textContent = n ? '(' + n.toLocaleString() + ' characters)' : '(empty)';
}

// Every message to the background resolves to {ok, result} or {ok:false, error}; never rejects.
async function send(message) {
  try {
    const response = await chrome.runtime.sendMessage(message);
    return (
      response || {
        ok: false,
        error: 'No response from the extension background. Reload the extension at chrome://extensions.',
      }
    );
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'Could not reach the extension background.' };
  }
}

async function checkConnection() {
  setConnection('pending', 'Connecting…');
  const slow = setTimeout(() => setConnection('pending', 'Connecting… the server may be waking up'), 4000);
  const response = await send({ type: 'ping' });
  clearTimeout(slow);
  if (!response.ok) {
    setConnection('bad', response.error);
    return;
  }
  const { authRequired, authorized } = response.result;
  if (authRequired && !authorized) {
    setConnection('warn', 'Server needs an API key. Add it in Settings.');
    return;
  }
  setConnection('ok', 'Connected');
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

async function loadPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab || null;

  const tabUrl = activeTab && /^https?:/i.test(activeTab.url || '') ? activeTab.url : '';
  let page = null;
  if (tabUrl) {
    try {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: extractJobFromPage,
      });
      page = (injection && injection.result) || null;
    } catch (e) {
      page = null; // e.g. Chrome Web Store or a page the browser blocks scripts on
    }
  }

  if (!page) {
    els.link.value = tabUrl;
    sourceSite = hostnameOf(tabUrl);
    showNotice('Could not read this page automatically. Fill in the details below.');
  } else {
    els.company.value = page.company || '';
    els.role.value = page.role || '';
    els.location.value = page.location || '';
    els.salary.value = page.salary || '';
    els.link.value = page.jd_link || tabUrl;
    els.description.value = page.job_description || '';
    sourceSite = page.source_site || hostnameOf(tabUrl);
    if (!page.company || !page.role) {
      showNotice("We couldn't detect the company or role on this page. Please fill them in.");
    } else if (!page.confident) {
      showNotice('Please double-check the company and role: this page did not look like a known job page.');
    }
  }

  els.source.textContent = sourceSite ? 'Source: ' + sourceSite : '';
  updateDescCount();
  (els.company.value ? els.role : els.company).focus();
}

async function onSave(event) {
  event.preventDefault();
  const company = els.company.value.trim();
  const role = els.role.value.trim();
  if (!company || !role) {
    showResult('error', 'Company and role are required.');
    (company ? els.role : els.company).focus();
    return;
  }

  const payload = buildPayload(
    {
      company,
      role,
      location: els.location.value.trim(),
      salary: els.salary.value.trim(),
      jd_link: els.link.value.trim(),
      job_description: els.description.value,
      source_site: sourceSite,
    },
    els.user.value
  );

  els.save.disabled = true;
  showResult('pending', 'Saving…');
  const slow = setTimeout(
    () => showResult('pending', 'Saving… the server may be waking up, this can take up to a minute.'),
    5000
  );
  const response = await send({ type: 'ingest', payload, tabId: activeTab ? activeTab.id : null });
  clearTimeout(slow);
  els.save.disabled = false;

  if (!response.ok) {
    showResult('error', response.error);
    return;
  }
  const { status, row_id: rowId } = response.result;
  if (status === 'saved') {
    showResult('saved', 'Saved to your tracker' + (rowId != null ? ' (row ' + rowId + ').' : '.'));
  } else {
    showResult(
      'duplicate',
      'Already in your tracker' + (rowId != null ? ' (row ' + rowId + ')' : '') + '. Nothing was added.'
    );
  }
}

async function init() {
  const settings = await getSettings();
  USERS.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    els.user.appendChild(option);
  });
  els.user.value = settings.defaultUser;

  els.user.addEventListener('change', () => saveSettings({ defaultUser: els.user.value }));
  els.description.addEventListener('input', updateDescCount);
  els.form.addEventListener('submit', onSave);
  $('open-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());

  checkConnection(); // intentionally not awaited: runs alongside page extraction
  await loadPage();
}

init().catch((e) => showResult('error', (e && e.message) || 'Something went wrong opening the popup.'));
