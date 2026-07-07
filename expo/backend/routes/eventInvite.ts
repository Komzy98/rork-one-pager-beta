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
  iosAppStoreUrl,
} from '@/utils/appStoreLinks';

const PRIMARY = '#e84393';
const PRIMARY_LIGHT = '#fce4ef';

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
}): string {
  const { event, eventId, from, webLink } = options;
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
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 700; color: ${PRIMARY};
      margin-bottom: 20px; letter-spacing: -0.2px;
    }
    .brand-dot {
      width: 10px; height: 10px; border-radius: 3px; background: ${PRIMARY};
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
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand"><span class="brand-dot"></span> One Pager</div>

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
  <style>
    body { font-family: -apple-system, sans-serif; background: #fafcfe; color: #1a1a2e;
      display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .box { max-width: 420px; text-align: center; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { color: #718096; margin-bottom: 18px; }
    a { color: #e84393; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="box">
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

    const html = renderEventInvitePage({
      event: result.event,
      eventId,
      from,
      webLink,
    });

    return c.html(html, 200, {
      'Cache-Control': 'public, max-age=300',
    });
  });
}

export { buildShareMessage };
