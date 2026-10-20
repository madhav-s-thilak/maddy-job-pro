# Maddy Job Pro: Chrome extension

Save the job you are looking at (LinkedIn, Wellfound, Greenhouse, or any careers page) to your Job Tracker in one click. It talks to the backend's `POST /extension/ingest` endpoint, which saves to your Google Sheet and skips duplicates (same company + role for the same person).

Manifest V3, plain JavaScript, no build step.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` and switch on **Developer mode**.
2. Click **Load unpacked** and pick this folder (`job-tracker-extension`).
3. The settings page opens on first install. Enter:
   - **API URL**: `http://localhost:8000` locally, or your Render URL.
   - **API key**: only if the backend has `EXTENSION_API_KEY` set (see below).
   - **Default person**: Madhav, Veena or Vandhana.
4. Press **Test connection**, then **Save settings**.

After changing any file here, press the reload icon on the extension's card in `chrome://extensions`.

## Using it

- **Popup**: open a job page, click the extension icon, check the pre-filled company and role, press **Save to tracker**. Everything is editable, and the description is under "Job description".
- **Right-click**: right-click the page and choose **Save job to Job Tracker**. It saves without a preview, and only when the company and role were detected reliably. The toolbar icon shows the result:
  - green ✓: saved
  - `dup`: already tracked, nothing added
  - `?`: not sure what job this is; click the icon and fill it in
  - red `!`: failed (hover the icon for the reason)

## Backend API key (recommended for any public deployment)

Without a key, anyone who finds your backend URL could add rows to your sheet.

1. Generate a key, for example `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`.
2. Set `EXTENSION_API_KEY` on the backend (Render dashboard, or the backend `.env` locally).
3. Paste the same key into the extension settings.

The key is sent as the `X-Extension-Key` header and stored in `chrome.storage.local` (this browser profile only, not synced). If `EXTENSION_API_KEY` is unset, no key is required.

## How it reads a page

Nothing runs on a page until you click the icon or the context-menu item (it uses `activeTab`, so there is no broad site access). It then injects `lib/extractor.js` once and reads, in order:

- **LinkedIn, Wellfound, Greenhouse**: the visible page, then the page's JSON-LD `JobPosting` data, then the tab title. The visible page goes first because these are single-page apps whose hidden data can describe a job you viewed earlier.
- **Any other site**: the page's JSON-LD `JobPosting` data (most careers pages and job boards include it).

LinkedIn links are normalised to `https://www.linkedin.com/jobs/view/<id>/`, and tracking parameters (`utm_*`, `trk*`, `gclid`, `fbclid`) are removed from links.

## Limits worth knowing

- The LinkedIn / Wellfound / Greenhouse CSS selectors are best-effort. Those sites change their markup without notice; when a selector stops matching, the popup still opens and you fill the gap by hand. Update the selectors in `lib/extractor.js` (`domFields`).
- Only the top-level page is read, so a Greenhouse board embedded in an `<iframe>` on a company's own site is not seen; open the job on `boards.greenhouse.io` instead, or fill in the popup.
- It reads the page you are viewing, when you ask. It does not crawl or scrape in the background; keep it that way, as LinkedIn's terms restrict automated scraping.
- The free Render tier sleeps. The first request can take up to a minute; the popup says so and waits.
- Descriptions are capped at 20,000 characters (Google Sheets cells hold 50,000).

## Files

| Path | Purpose |
|---|---|
| `manifest.json` | MV3 manifest: permissions `storage`, `activeTab`, `scripting`, `contextMenus` |
| `background.js` | Service worker: all network calls, right-click save, toolbar badge |
| `lib/extractor.js` | Page reader (injected into the tab; must stay self-contained) |
| `lib/api.js` | `/extension/ping` and `/extension/ingest` client, error messages |
| `lib/settings.js` | Settings storage and validation |
| `popup/` | The preview-and-save popup |
| `options/` | Settings page with Test connection |
| `icons/` | 16 / 48 / 128 px icons |

## Troubleshooting

| Popup says | Meaning / fix |
|---|---|
| "Cannot reach …" | Backend not running or wrong API URL. Check Settings. |
| "took too long to respond" | Free-tier server still waking. Try again in a minute. |
| "Server needs an API key" / "rejected the API key" | Set the same key in Settings as `EXTENSION_API_KEY` on the backend. |
| "did not answer like the Job Tracker API" | The URL points at something other than the backend. |
| "Could not read this page automatically" | Browser-internal pages (`chrome://`, the Web Store) block extensions. Fill in the form by hand. |
