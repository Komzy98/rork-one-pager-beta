# Event invite links (Phase 1)

Share links use **`https://join.onepagerapp.co.uk/event/{id}`** so friends without the app see a web page with event details and App Store links.

## Deploy

1. Push to the branch Railway builds (`main`).
2. Confirm the invite page loads:
   ```bash
   curl -I "https://join.onepagerapp.co.uk/event/tm-G5vYZ_F6nZj_s"
   ```
3. Confirm universal-link files:
   ```bash
   curl "https://join.onepagerapp.co.uk/.well-known/apple-app-site-association"
   curl "https://join.onepagerapp.co.uk/.well-known/assetlinks.json"
   ```

## Railway env (optional, for universal links)

| Variable | Purpose |
|----------|---------|
| `APPLE_TEAM_ID` | 10-char Apple Developer Team ID for iOS universal links |
| `ANDROID_APP_LINK_SHA256` | SHA-256 cert fingerprint for Android App Links |

Find Team ID: [Apple Developer](https://developer.apple.com/account) → Membership.

Without `APPLE_TEAM_ID`, the web invite page still works; iOS may not auto-open the app from HTTPS links until set and a new build is installed.

## Native app rebuild

`associatedDomains` and Android `intentFilters` for `join.onepagerapp.co.uk` require a **new EAS iOS/Android build** after merging.

## Share behaviour in app

- **Share / Invite** sends the HTTPS link (with `?from=username` when signed in).
- **Web invite page** lets friends respond **I'm in / Maybe / Can't go** without the app (name + one tap).
- **Open in One Pager** on the web page uses `onepager:///event/{id}`.
- Installed app: universal links route to `/(root)/event/[id]`.

## Database

Run migration `006_guest_rsvps.sql` on Supabase so web RSVPs persist and appear in the app under **Who's going**.

## Marketing site

- `onepagerapp.co.uk` → Framer (unchanged)
- `join.onepagerapp.co.uk` → Railway API + invite pages
