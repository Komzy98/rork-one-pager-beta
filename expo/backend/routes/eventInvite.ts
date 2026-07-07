import fs from 'fs';
import path from 'path';
import type { Hono } from 'hono';
import type { LocalEvent } from '@/types/events';
import { fetchEventById } from '@/utils/fetchEventById';
import {
  buildEventAppLink,
  buildEventWebLink,
} from '@/utils/deepLinks';
import {
  ANDROID_PACKAGE,
  IOS_APP_STORE_ID,
  MARKETING_SITE_URL,
  androidPlayStoreUrl,
  INVITE_LOGO_URL,
  iosAppStoreUrl,
} from '@/utils/appStoreLinks';
import {
  getGuestRsvpByToken,
  getGuestRsvpSummary,
  upsertGuestRsvp,
  type GuestRsvpStatus,
  type GuestRsvpSummary,
} from '../services/guestRsvpService';

const PRIMARY = '#e84393';
const PRIMARY_LIGHT = '#fce4ef';

let cachedLogoBytes: Buffer | null | undefined;

function resolveInviteLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'assets/images/icon.png'),
    path.join(process.cwd(), 'expo/assets/images/icon.png'),
    path.resolve(__dirname, '../../assets/images/icon.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function getInviteLogoBytes(): Buffer | null {
  if (cachedLogoBytes !== undefined) return cachedLogoBytes;
  const logoPath = resolveInviteLogoPath();
  if (!logoPath) {
    cachedLogoBytes = null;
    return null;
  }
  try {
    cachedLogoBytes = fs.readFileSync(logoPath);
    return cachedLogoBytes;
  } catch {
    cachedLogoBytes = null;
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildShareMessage(event: LocalEvent, webLink: string): string {
  return [
    `Join me for ${event.title}`,
    `${event.date} · ${event.time}`.trim(),
    event.venue,
    webLink,
  ]
    .filter(Boolean)
    .join('\n');
}

export function renderEventInvitePage(options: {
  event: LocalEvent;
  eventId: string;
  from?: string | null;
  webLink: string;
  rsvpSummary?: GuestRsvpSummary;
}): string {
  const { event, eventId, from, webLink, rsvpSummary } = options;
  const summary = rsvpSummary ?? { going: 0, maybe: 0, cant: 0, responses: [] };
  const totalResponses = summary.going + summary.maybe + summary.cant;
  const appLink = buildEventAppLink(eventId);
  const inviteLine = from
    ? `@${escapeHtml(from.replace(/^@/, ''))} invited you`
    : 'You&apos;re invited';
  const title = escapeHtml(event.title);
  const venue = escapeHtml(event.venue);
  const location = escapeHtml(event.location);
  const dateTime = escapeHtml(`${event.date} · ${event.time}`);
  const price = escapeHtml(event.price);
  const image = event.image ? escapeHtml(event.image) : '';
  const ticketUrl = event.ticketUrl ? escapeHtml(event.ticketUrl) : '';
  const description = escapeHtml(
    event.description?.slice(0, 280) || `${event.title} at ${event.venue}.`,
  );
  const ogDescription = from
    ? `${from.replace(/^@/, '')} invited you to ${event.title}`
    : `Join for ${event.title} — ${event.date}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${title} · One Pager</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${escapeHtml(webLink)}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="apple-itunes-app" content="app-id=${IOS_APP_STORE_ID}, app-argument=${escapeHtml(appLink)}" />
  <link rel="icon" type="image/png" href="${escapeHtml(INVITE_LOGO_URL)}" />
  <link rel="apple-touch-icon" href="${escapeHtml(INVITE_LOGO_URL)}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(180deg, #fafcfe 0%, #f4f7fc 100%);
      color: #1a1a2e;
      min-height: 100vh;
      line-height: 1.45;
    }
    .wrap { max-width: 480px; margin: 0 auto; padding: 24px 20px 40px; }
    .brand {
      display: inline-flex; align-items: center; gap: 10px;
      margin-bottom: 20px; text-decoration: none;
    }
    .brand-logo {
      width: 40px; height: 40px; border-radius: 11px;
      box-shadow: 0 6px 16px rgba(232, 67, 147, 0.18);
      display: block;
    }
    .brand-name {
      font-size: 16px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.3px;
    }
    .hero {
      border-radius: 20px; overflow: hidden; background: #111;
      box-shadow: 0 16px 40px rgba(232, 67, 147, 0.12);
      margin-bottom: 18px;
    }
    .hero img { width: 100%; aspect-ratio: 16/10; object-fit: cover; display: block; }
    .hero-fallback {
      aspect-ratio: 16/10;
      background: linear-gradient(135deg, #2d1b4e 0%, ${PRIMARY} 100%);
    }
    .card {
      background: #fff; border: 1px solid rgba(0,0,0,0.06);
      border-radius: 18px; padding: 18px; margin-bottom: 14px;
    }
    .pill {
      display: inline-block; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.4px;
      color: ${PRIMARY}; background: ${PRIMARY_LIGHT};
      padding: 5px 10px; border-radius: 999px; margin-bottom: 10px;
    }
    h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
    .meta { font-size: 15px; font-weight: 600; color: #4a5568; margin-bottom: 4px; }
    .venue { font-size: 14px; color: #718096; }
    .price { font-size: 16px; font-weight: 800; color: ${PRIMARY}; margin-top: 10px; }
    .desc { font-size: 14px; color: #4a5568; margin-top: 12px; line-height: 1.5; }
    .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
    .btn {
      display: flex; align-items: center; justify-content: center;
      min-height: 48px; border-radius: 14px; font-size: 15px; font-weight: 700;
      text-decoration: none; border: none; cursor: pointer;
    }
    .btn-primary { background: ${PRIMARY}; color: #fff; }
    .btn-secondary {
      background: #fff; color: ${PRIMARY}; border: 1px solid rgba(232,67,147,0.25);
    }
    .btn-ghost { background: transparent; color: #718096; font-size: 13px; min-height: 40px; }
    .footer {
      text-align: center; font-size: 12px; color: #a0aec0; margin-top: 24px;
    }
    .footer a { color: ${PRIMARY}; text-decoration: none; font-weight: 600; }
    .rsvp {
      margin-top: 16px; padding-top: 16px;
      border-top: 1px solid rgba(0,0,0,0.06);
    }
    .rsvp-title { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
    .rsvp-meta { font-size: 12px; color: #718096; font-weight: 600; margin-bottom: 12px; }
    .rsvp-input {
      width: 100%; min-height: 44px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1);
      padding: 10px 12px; font-size: 15px; margin-bottom: 10px; background: #fafcfe;
    }
    .rsvp-row { display: flex; gap: 8px; }
    .rsvp-btn {
      flex: 1; min-height: 44px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.08);
      background: #f8fafc; color: #4a5568; font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .rsvp-btn.active {
      border-color: ${PRIMARY}; background: ${PRIMARY_LIGHT}; color: ${PRIMARY};
    }
    .rsvp-btn:disabled { opacity: 0.6; cursor: wait; }
    .rsvp-msg { font-size: 13px; font-weight: 600; margin-top: 10px; min-height: 18px; }
    .rsvp-msg.ok { color: #2f855a; }
    .rsvp-msg.err { color: #c53030; }
    .rsvp-list { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
    .rsvp-chip {
      font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 999px;
      background: #f1f5f9; color: #4a5568;
    }
    .rsvp-chip.in { background: ${PRIMARY_LIGHT}; color: ${PRIMARY}; }
    .rsvp-chip.maybe { background: #fef3c7; color: #b45309; }
    .rsvp-chip.cant { background: #fee2e2; color: #b91c1c; }
    .rsvp-divider { margin: 16px 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.4px;
      text-transform: uppercase; color: #a0aec0; }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="brand" href="${escapeHtml(MARKETING_SITE_URL)}">
      <img class="brand-logo" src="${escapeHtml(INVITE_LOGO_URL)}" alt="One Pager" width="40" height="40" />
      <span class="brand-name">One Pager</span>
    </a>

    <div class="hero">
      ${image ? `<img src="${image}" alt="${title}" />` : '<div class="hero-fallback"></div>'}
    </div>

    <div class="card">
      <div class="pill">${inviteLine}</div>
      <h1>${title}</h1>
      <div class="meta">${dateTime}</div>
      <div class="venue">${venue}${location ? ` · ${location}` : ''}</div>
      <div class="price">${price}</div>
      <p class="desc">${description}</p>

      <div class="rsvp" id="rsvp-section">
        <div class="rsvp-title">Your response</div>
        <div class="rsvp-meta" id="rsvp-counts">
          ${totalResponses > 0
            ? `${summary.going} in${summary.maybe > 0 ? ` · ${summary.maybe} maybe` : ''}${summary.cant > 0 ? ` · ${summary.cant} can't` : ''}`
            : 'Let them know if you can make it'}
        </div>
        <input
          class="rsvp-input"
          id="guest-name"
          type="text"
          maxlength="80"
          placeholder="Your name"
          autocomplete="name"
        />
        <div class="rsvp-row">
          <button type="button" class="rsvp-btn" data-status="in" id="rsvp-in">I'm in</button>
          <button type="button" class="rsvp-btn" data-status="maybe" id="rsvp-maybe">Maybe</button>
          <button type="button" class="rsvp-btn" data-status="cant" id="rsvp-cant">Can't go</button>
        </div>
        <p class="rsvp-msg" id="rsvp-msg" role="status"></p>
        ${summary.responses.length > 0
          ? `<div class="rsvp-list" id="rsvp-list">${summary.responses
              .slice(0, 8)
              .map(
                (r) =>
                  `<span class="rsvp-chip ${escapeHtml(r.status)}">${escapeHtml(r.displayName)} · ${
                    r.status === 'in' ? 'In' : r.status === 'maybe' ? 'Maybe' : "Can't"
                  }</span>`
              )
              .join('')}</div>`
          : '<div class="rsvp-list" id="rsvp-list"></div>'}
      </div>

      <p class="rsvp-divider">Get the app</p>
      <div class="actions">
        <a class="btn btn-primary" href="${escapeHtml(appLink)}" id="open-app">Open in One Pager</a>
        <a class="btn btn-secondary" href="${escapeHtml(iosAppStoreUrl())}">Download on the App Store</a>
        <a class="btn btn-secondary" href="${escapeHtml(androidPlayStoreUrl())}">Get it on Google Play</a>
        ${ticketUrl ? `<a class="btn btn-ghost" href="${ticketUrl}">See tickets</a>` : ''}
      </div>
    </div>

    <p class="footer">
      Plan nights out, track what matters, see what friends are up to.<br />
      <a href="${escapeHtml(MARKETING_SITE_URL)}">Learn more at onepagerapp.co.uk</a>
    </p>
  </div>
  <script>
    (function () {
      var eventId = ${JSON.stringify(eventId)};
      var fromParam = ${JSON.stringify(from ?? null)};
      var storageKey = 'op_guest_rsvp_' + eventId;
      var nameInput = document.getElementById('guest-name');
      var msgEl = document.getElementById('rsvp-msg');
      var countsEl = document.getElementById('rsvp-counts');
      var listEl = document.getElementById('rsvp-list');
      var buttons = Array.prototype.slice.call(document.querySelectorAll('.rsvp-btn'));
      var currentStatus = null;
      var guestToken = null;

      function setMsg(text, kind) {
        msgEl.textContent = text || '';
        msgEl.className = 'rsvp-msg' + (kind ? ' ' + kind : '');
      }

      function setActive(status) {
        currentStatus = status;
        buttons.forEach(function (btn) {
          btn.classList.toggle('active', btn.getAttribute('data-status') === status);
        });
      }

      function statusLabel(status) {
        if (status === 'in') return "You're in!";
        if (status === 'maybe') return 'Marked as maybe.';
        return "Can't make it — noted.";
      }

      function renderCounts(summary) {
        var total = summary.going + summary.maybe + summary.cant;
        if (!total) {
          countsEl.textContent = 'Let them know if you can make it';
          return;
        }
        var parts = [summary.going + ' in'];
        if (summary.maybe > 0) parts.push(summary.maybe + ' maybe');
        if (summary.cant > 0) parts.push(summary.cant + " can't");
        countsEl.textContent = parts.join(' · ');
      }

      function renderList(responses) {
        if (!responses || !responses.length) {
          listEl.innerHTML = '';
          return;
        }
        function esc(text) {
          return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        }
        listEl.innerHTML = responses.slice(0, 8).map(function (r) {
          var tag = r.status === 'in' ? 'In' : r.status === 'maybe' ? 'Maybe' : "Can't";
          return '<span class="rsvp-chip ' + esc(r.status) + '">' + esc(r.displayName) + ' · ' + tag + '</span>';
        }).join('');
      }

      function loadStored() {
        try {
          var raw = localStorage.getItem(storageKey);
          if (!raw) return;
          var parsed = JSON.parse(raw);
          guestToken = parsed.token || null;
          if (parsed.name && nameInput) nameInput.value = parsed.name;
          if (parsed.status) setActive(parsed.status);
        } catch (e) {}
      }

      async function submitRsvp(status) {
        var name = (nameInput && nameInput.value || '').trim();
        if (!name) {
          setMsg('Please enter your name first.', 'err');
          if (nameInput) nameInput.focus();
          return;
        }
        setMsg('Saving…', '');
        buttons.forEach(function (btn) { btn.disabled = true; });
        try {
          var res = await fetch('/event/' + encodeURIComponent(eventId) + '/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name,
              status: status,
              token: guestToken,
              from: fromParam,
            }),
          });
          var data = await res.json().catch(function () { return {}; });
          if (!res.ok) {
            throw new Error(data.error || 'Could not save your response.');
          }
          guestToken = data.guestToken;
          localStorage.setItem(storageKey, JSON.stringify({
            token: guestToken,
            name: data.displayName,
            status: data.status,
          }));
          setActive(data.status);
          setMsg(statusLabel(data.status), 'ok');
          if (data.summary) {
            renderCounts(data.summary);
            renderList(data.summary.responses);
          }
        } catch (err) {
          setMsg(err && err.message ? err.message : 'Something went wrong.', 'err');
        } finally {
          buttons.forEach(function (btn) { btn.disabled = false; });
        }
      }

      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          submitRsvp(btn.getAttribute('data-status'));
        });
      });

      loadStored();

      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      var isAndroid = /Android/.test(navigator.userAgent);
      if (isIOS) {
        var playBtns = document.querySelectorAll('a[href*="play.google.com"]');
        playBtns.forEach(function (el) { el.style.display = 'none'; });
      } else if (isAndroid) {
        var iosBtns = document.querySelectorAll('a[href*="apps.apple.com"]');
        iosBtns.forEach(function (el) { el.style.display = 'none'; });
      }
    })();
  </script>
</body>
</html>`;
}

function renderNotFoundPage(eventId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Event not found · One Pager</title>
  <link rel="icon" type="image/png" href="${escapeHtml(INVITE_LOGO_URL)}" />
  <style>
    body { font-family: -apple-system, sans-serif; background: #fafcfe; color: #1a1a2e;
      display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .box { max-width: 420px; text-align: center; }
    .brand-logo { width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 16px;
      box-shadow: 0 6px 16px rgba(232, 67, 147, 0.18); }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { color: #718096; margin-bottom: 18px; }
    a { color: #e84393; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="box">
    <img class="brand-logo" src="${escapeHtml(INVITE_LOGO_URL)}" alt="One Pager" width="48" height="48" />
    <h1>Event not found</h1>
    <p>This event may have ended or the link is no longer valid.</p>
    <p><a href="${escapeHtml(iosAppStoreUrl())}">Get One Pager</a> · <a href="${escapeHtml(MARKETING_SITE_URL)}">onepagerapp.co.uk</a></p>
  </div>
</body>
</html>`;
}

function buildAppleAppSiteAssociation(): object {
  const teamId = (process.env.APPLE_TEAM_ID || '').trim();
  const appIds = teamId ? [`${teamId}.app.rork.OPbeta`] : [];
  return {
    applinks: {
      apps: [],
      details: appIds.length
        ? [{ appIDs: appIds, paths: ['/event/*', '/invite/*'] }]
        : [],
    },
  };
}

function buildAssetLinks(): object[] {
  const sha256 = (process.env.ANDROID_APP_LINK_SHA256 || '').trim();
  if (!sha256) return [];
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: [sha256],
      },
    },
  ];
}

export function registerEventInviteRoutes(app: Hono): void {
  app.get('/assets/onepager-icon.png', (c) => {
    const bytes = getInviteLogoBytes();
    if (!bytes) {
      return c.text('Logo not found', 404);
    }
    return c.body(bytes, 200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    });
  });

  app.get('/.well-known/apple-app-site-association', (c) => {
    return c.json(buildAppleAppSiteAssociation(), 200, {
      'Content-Type': 'application/json',
    });
  });

  app.get('/.well-known/assetlinks.json', (c) => {
    return c.json(buildAssetLinks(), 200, {
      'Content-Type': 'application/json',
    });
  });

  app.get('/event/:id', async (c) => {
    const eventId = decodeURIComponent(c.req.param('id'));
    const from = c.req.query('from') ?? null;
    const webLink = buildEventWebLink(eventId, { from });

    const result = await fetchEventById(eventId);
    if (!result) {
      return c.html(renderNotFoundPage(eventId), 404);
    }

    let rsvpSummary: GuestRsvpSummary = { going: 0, maybe: 0, cant: 0, responses: [] };
    try {
      rsvpSummary = await getGuestRsvpSummary(eventId);
    } catch (err) {
      console.warn('[eventInvite] guest RSVP summary failed:', err);
    }

    const html = renderEventInvitePage({
      event: result.event,
      eventId,
      from,
      webLink,
      rsvpSummary,
    });

    return c.html(html, 200, {
      'Cache-Control': 'public, max-age=60',
    });
  });

  app.get('/event/:id/rsvp', async (c) => {
    const eventId = decodeURIComponent(c.req.param('id'));
    const token = c.req.query('token')?.trim();
    if (!token) {
      return c.json({ error: 'Missing token.' }, 400);
    }

    try {
      const row = await getGuestRsvpByToken(eventId, token);
      if (!row) {
        return c.json({ error: 'Response not found.' }, 404);
      }
      return c.json({
        guestToken: row.guest_token,
        displayName: row.display_name,
        status: row.status,
      });
    } catch (err) {
      console.error('[eventInvite] get guest rsvp failed:', err);
      return c.json({ error: 'Could not load your response.' }, 500);
    }
  });

  app.post('/event/:id/rsvp', async (c) => {
    const eventId = decodeURIComponent(c.req.param('id'));
    const body = await c.req.json().catch(() => null);

    const name = typeof body?.name === 'string' ? body.name : '';
    const status = body?.status as GuestRsvpStatus;
    const token = typeof body?.token === 'string' ? body.token : null;
    const from = typeof body?.from === 'string' ? body.from : c.req.query('from') ?? null;

    if (!['in', 'maybe', 'cant'].includes(status)) {
      return c.json({ error: 'Pick I\'m in, Maybe, or Can\'t go.' }, 400);
    }

    const result = await fetchEventById(eventId);
    if (!result) {
      return c.json({ error: 'Event not found.' }, 404);
    }

    try {
      const saved = await upsertGuestRsvp({
        event: result.event,
        displayName: name,
        status,
        guestToken: token,
        invitedBy: from,
      });
      const summary = await getGuestRsvpSummary(eventId);
      return c.json({ ...saved, summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your response.';
      console.error('[eventInvite] guest rsvp failed:', err);
      return c.json({ error: message }, 400);
    }
  });
}

export { buildShareMessage };
