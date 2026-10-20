// Talks to the Job Tracker backend (/extension/ping and /extension/ingest).
// Every function takes the settings explicitly so the options page can test
// values that have not been saved yet.

import { normalizeApiUrl } from './settings.js';

// Render's free tier can take close to a minute to wake from sleep.
const REQUEST_TIMEOUT_MS = 60000;

export class ApiError extends Error {
  constructor(message, kind = 'http', status = 0) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind; // 'config' | 'network' | 'timeout' | 'auth' | 'http' | 'response'
    this.status = status;
  }
}

// FastAPI errors: {detail: "text"} or {detail: [{loc: [...], msg: "..."}]}
function detailToMessage(data, status) {
  const detail = data && data.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : '';
        return field ? `${field}: ${d.msg}` : String(d.msg);
      })
      .join('; ');
  }
  return `The server returned an error (HTTP ${status}).`;
}

async function call(settings, path, { method = 'GET', body } = {}) {
  let base;
  try {
    base = normalizeApiUrl(settings.apiUrl);
  } catch (e) {
    throw new ApiError(e.message, 'config');
  }

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (settings.apiKey) headers['X-Extension-Key'] = settings.apiKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  let text;
  try {
    res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    text = await res.text();
  } catch (e) {
    if (e && e.name === 'AbortError') {
      throw new ApiError(
        'The server took too long to respond. If it is hosted on a free tier it may still be waking up. Try again in a minute.',
        'timeout'
      );
    }
    throw new ApiError(
      `Cannot reach ${base}. Check the API URL in Settings and that the backend is running.`,
      'network'
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new ApiError('The server rejected the API key. Check the key in Settings.', 'auth', res.status);
    }
    throw new ApiError(detailToMessage(data, res.status), 'http', res.status);
  }
  return data;
}

/** -> { apiVersion, authRequired, authorized } */
export async function pingServer(settings) {
  const data = await call(settings, '/extension/ping');
  if (!data || data.status !== 'ok') {
    throw new ApiError('That URL did not answer like the Job Tracker API. Is the API URL correct?', 'response');
  }
  return {
    apiVersion: data.api_version || '',
    authRequired: Boolean(data.auth_required),
    // Older backends do not send these fields: treat as open.
    authorized: data.authorized !== false,
  };
}

/** -> { status: 'saved' | 'duplicate', row_id, message } */
export async function ingestJob(settings, payload) {
  const data = await call(settings, '/extension/ingest', { method: 'POST', body: payload });
  if (!data || (data.status !== 'saved' && data.status !== 'duplicate')) {
    throw new ApiError('Unexpected response from the server. Is the API URL correct?', 'response');
  }
  return data;
}

/** Builds the /extension/ingest body from the editable job fields. */
export function buildPayload(job, user) {
  return {
    user,
    company: String(job.company || '').trim(),
    role: String(job.role || '').trim(),
    job_description: job.job_description || '',
    jd_link: job.jd_link || '',
    location: job.location || '',
    salary: job.salary || '',
    source_site: job.source_site || '',
    extension_version: chrome.runtime.getManifest().version,
  };
}
