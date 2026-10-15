# Fever discovery provider — production setup

Fever's official event catalog is exposed through an MCP endpoint, not the partner reporting API.
For an unattended app backend, Fever must issue machine-to-machine OAuth credentials.
See: https://developer.feverup.com/en/

Request a `client_id`, `client_secret`, and API identifier (`audience`) from
`data-ai@feverup.com`. Tell Fever that One Pager is an event discovery app
serving UK users and needs approved production machine-to-machine access.

Add three private **Railway backend** variables to the `joyful-victory` production service:

- `FEVER_CLIENT_ID`
- `FEVER_CLIENT_SECRET`
- `FEVER_AUDIENCE`

Do **not** use `EXPO_PUBLIC_` variables, commit secrets, or paste them into chat.
Fever is disabled until all three are set. `/health/fever` reports configuration
presence only; it is **not** an authentication test.

The backend obtains `mcp:service` tokens via client credentials, opens a MCP
Streamable HTTP session, and calls `search_events` and `search_venues`.
Only upcoming events with a verified Fever venue, map coordinates, timezone,
and official ticket URL enter the One Pager feed. Other provider feeds continue
working if Fever is unavailable. A 5-minute cache limits repeated calls.

After setting credentials, verify a real nearby search and the logs for Fever
HTTP/auth errors and actual `fv-` events. Run iOS TestFlight build **manually**;
automatic EAS submission is disabled in this repository.
