// Reads job details from the page the user is looking at.
//
// This function is injected with chrome.scripting.executeScript({ func }), which
// serializes it with toString(). It therefore MUST stay fully self-contained:
// no imports, no references to anything outside its own body.
//
// Source priority:
//   known job sites (LinkedIn / Wellfound / Greenhouse): page DOM -> JSON-LD -> <title>
//   everything else:                                      JSON-LD JobPosting only
// The DOM wins on known sites because they are single-page apps whose <head>
// JSON-LD can describe a previously viewed job. Generic h1 / og:site_name guesses
// are only used to pre-fill the popup; they never set `confident`.
//
// Returns { company, role, location, salary, job_description, jd_link,
//           source_site, confident }
// `confident` is true only when company AND role came from a trustworthy source;
// the right-click one-click save refuses to save unless it is true.
export function extractJobFromPage() {
  const MAX_LINE = 200;
  const MAX_SALARY = 120;
  const MAX_DESCRIPTION = 20000; // Google Sheets cells hold at most 50,000 characters

  const str = (v) => (v == null ? '' : String(v));
  const line = (v, max) => str(v).replace(/\s+/g, ' ').trim().slice(0, max || MAX_LINE);
  const block = (v) =>
    str(v)
      .replace(/\r/g, '')
      .replace(/[ \t ]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_DESCRIPTION);
  const textOf = (el) => (el ? str(el.innerText || el.textContent) : '');
  const safe = (fn) => {
    try {
      return fn() || {};
    } catch (e) {
      return {};
    }
  };

  const queryAll = (selector) => {
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  };
  const firstLine = (selectors) => {
    for (const selector of selectors) {
      for (const el of queryAll(selector)) {
        const t = line(textOf(el));
        if (t) return t;
      }
    }
    return '';
  };
  const firstBlock = (selectors, minLength) => {
    for (const selector of selectors) {
      for (const el of queryAll(selector)) {
        const t = block(textOf(el));
        if (t.length >= minLength) return t;
      }
    }
    return '';
  };
  const meta = (key) => {
    const el = document.querySelector('meta[property="' + key + '"], meta[name="' + key + '"]');
    return el ? str(el.getAttribute('content')).trim() : '';
  };

  // ---- Which site is this? -------------------------------------------------
  const host = location.hostname.toLowerCase().replace(/^www\./, '');
  let site = host;
  if (/(^|\.)linkedin\.com$/.test(host)) site = 'linkedin';
  else if (/(^|\.)(wellfound\.com|angel\.co)$/.test(host)) site = 'wellfound';
  else if (/(^|\.)greenhouse\.io$/.test(host)) site = 'greenhouse';
  const known = site === 'linkedin' || site === 'wellfound' || site === 'greenhouse';

  // ---- JSON-LD (schema.org JobPosting) --------------------------------------
  // Descriptions are HTML, sometimes entity-escaped twice, so loop until no tags remain.
  const htmlToText = (html) => {
    let out = str(html);
    for (let pass = 0; pass < 2; pass++) {
      const spaced = out
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\/\s*(p|div|li|ul|ol|h[1-6]|tr)\s*>/gi, '\n');
      const doc = new DOMParser().parseFromString(spaced, 'text/html');
      out = (doc.body && doc.body.textContent) || '';
      if (!/<\/?[a-z][^>]*>/i.test(out)) break;
    }
    return block(out);
  };

  const findJobPosting = () => {
    const nodes = [];
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      nodes.push(node);
      if (node['@graph']) visit(node['@graph']);
    };
    queryAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        visit(JSON.parse(script.textContent));
      } catch (e) {
        /* malformed JSON-LD: ignore this block */
      }
    });
    return (
      nodes.find((n) => {
        const t = n['@type'];
        return t === 'JobPosting' || (Array.isArray(t) && t.indexOf('JobPosting') !== -1);
      }) || null
    );
  };

  const ldLocation = (jp) => {
    const parts = [];
    [].concat(jp.jobLocation || []).forEach((loc) => {
      const address = loc && loc.address;
      if (!address) return;
      if (typeof address === 'string') {
        parts.push(address);
        return;
      }
      const country =
        address.addressCountry && typeof address.addressCountry === 'object'
          ? address.addressCountry.name
          : address.addressCountry;
      parts.push([address.addressLocality, address.addressRegion, country].filter(Boolean).join(', '));
    });
    let out = parts.filter(Boolean).slice(0, 3).join(' | ');
    if (/TELECOMMUTE/i.test(str(jp.jobLocationType))) out = out ? 'Remote (' + out + ')' : 'Remote';
    return line(out);
  };

  const ldSalary = (jp) => {
    const s = jp.baseSalary;
    if (!s || typeof s !== 'object') return '';
    const q = s.value && typeof s.value === 'object' ? s.value : s;
    const single = s.value && typeof s.value !== 'object' ? s.value : q.value;
    let amount = '';
    if (q.minValue != null && q.maxValue != null && str(q.minValue) !== str(q.maxValue)) {
      amount = q.minValue + '-' + q.maxValue;
    } else if (q.minValue != null) amount = str(q.minValue);
    else if (q.maxValue != null) amount = str(q.maxValue);
    else if (single != null) amount = str(single);
    if (!amount) return '';
    const unit = q.unitText || s.unitText;
    return line(
      [s.currency || q.currency, amount, unit ? '/ ' + str(unit).toLowerCase() : ''].filter(Boolean).join(' '),
      MAX_SALARY
    );
  };

  const ldFields = () => {
    const jp = findJobPosting();
    if (!jp) return {};
    let org = jp.hiringOrganization;
    if (Array.isArray(org)) org = org[0];
    return {
      role: line(jp.title || jp.name),
      company: line(typeof org === 'string' ? org : org && org.name),
      location: ldLocation(jp),
      salary: ldSalary(jp),
      description: htmlToText(jp.description),
    };
  };

  // ---- Site specific DOM ------------------------------------------------------
  // Selectors are best-effort and may need updating when a site changes its markup.
  const domFields = () => {
    if (site === 'linkedin') {
      return {
        role: firstLine([
          '.job-details-jobs-unified-top-card__job-title h1',
          '.job-details-jobs-unified-top-card__job-title',
          '.jobs-unified-top-card__job-title',
          'h1.top-card-layout__title',
          'h1.topcard__title',
          '.job-view-layout h1',
        ]),
        company: firstLine([
          '.job-details-jobs-unified-top-card__company-name a',
          '.job-details-jobs-unified-top-card__company-name',
          '.jobs-unified-top-card__company-name a',
          '.jobs-unified-top-card__company-name',
          'a.topcard__org-name-link',
          '.topcard__flavor:first-child a',
        ]),
        location: firstLine([
          '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
          '.job-details-jobs-unified-top-card__bullet',
          '.jobs-unified-top-card__bullet',
          '.topcard__flavor--bullet',
        ]),
        description: firstBlock(
          [
            '#job-details',
            '.jobs-description__content',
            '.jobs-description-content__text',
            '.jobs-box__html-content',
            '.show-more-less-html__markup',
            '.description__text',
          ],
          40
        ),
      };
    }
    if (site === 'wellfound') {
      return {
        role: firstLine(['h1']),
        company: firstLine(['a[href^="/company/"] h2', 'a[href^="/company/"] h1', 'a[href^="/company/"]']),
        description: firstBlock(
          ['[data-test="JobDescription"]', '[class*="jobDescription"]', '[class*="description"]'],
          80
        ),
      };
    }
    if (site === 'greenhouse') {
      return {
        role: firstLine(['h1.app-title', '.job__title h1', 'h1.section-header', '#header h1', 'h1']),
        company: firstLine(['.company-name', '#header .company-name', '.job__company']).replace(/^at\s+/i, ''),
        location: firstLine(['.location', '.job__location', '#header .location', '.job-location']),
        description: firstBlock(['#content', '.job__description', '.job-post-content', '#job-description'], 80),
      };
    }
    return {};
  };

  // ---- <title> / og:title on known sites -------------------------------------
  const titleFields = () => {
    const title = line(document.title);
    if (site === 'linkedin') {
      const t = title.replace(/^\(\d+\)\s*/, '');
      // "Acme hiring Software Engineer in Berlin | LinkedIn"
      let m = t.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+?))?\s*\|\s*LinkedIn$/i);
      if (m) return { company: line(m[1]), role: line(m[2]), location: line(m[3]) };
      // "Software Engineer | Acme | LinkedIn"
      m = t.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*LinkedIn$/i);
      if (m) return { role: line(m[1]), company: line(m[2]) };
      return {};
    }
    if (site === 'wellfound') {
      const t = title.replace(/\s*[|\-–]\s*(Wellfound|AngelList)(\s+Talent)?\s*$/i, '');
      const m = t.match(/^(.+?)\s+(?:job\s+)?at\s+(.+)$/i);
      if (m) return { role: line(m[1]), company: line(m[2].split(/\s+[-–—]\s+/)[0]) };
      return {};
    }
    if (site === 'greenhouse') {
      const candidates = [title, line(meta('og:title'))];
      for (const t of candidates) {
        const m = t.match(/^Job Application for (.+) at (.+)$/i);
        if (m) return { role: line(m[1]), company: line(m[2]) };
      }
    }
    return {};
  };

  // ---- Combine -----------------------------------------------------------------
  const dom = known ? safe(domFields) : {};
  const ld = safe(ldFields);
  const ti = known ? safe(titleFields) : {};
  const sources = known ? [dom, ld, ti] : [ld];
  const pick = (key) => {
    for (const source of sources) {
      if (source[key]) return source[key];
    }
    return '';
  };

  const company = pick('company');
  const role = pick('role');

  // Weak guesses: pre-fill only, never counted as `confident`.
  const weakRole = () => firstLine(['h1']) || line(meta('og:title'));
  const weakCompany = () => line(meta('og:site_name'));
  const description =
    pick('description') ||
    block(textOf(document.querySelector('main, [role="main"], article') || document.body));

  // ---- Stable link -----------------------------------------------------------------
  const cleanLink = () => {
    try {
      const url = new URL(location.href);
      if (site === 'linkedin') {
        // /jobs/view/<slug-><id>/ or any page carrying ?currentJobId=<id>
        const m = url.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)/);
        const id = m ? m[1] : url.searchParams.get('currentJobId');
        if (id && /^\d+$/.test(id)) return 'https://www.linkedin.com/jobs/view/' + id + '/';
      }
      Array.from(url.searchParams.keys()).forEach((key) => {
        if (/^(utm_|trk|gclid$|fbclid$|refid$|trackingid$)/i.test(key)) url.searchParams.delete(key);
      });
      return url.toString();
    } catch (e) {
      return location.href;
    }
  };

  return {
    company: company || safe(() => ({ v: weakCompany() })).v || '',
    role: role || safe(() => ({ v: weakRole() })).v || '',
    location: pick('location'),
    salary: pick('salary'),
    job_description: description,
    jd_link: cleanLink(),
    source_site: site,
    confident: Boolean(company && role),
  };
}
