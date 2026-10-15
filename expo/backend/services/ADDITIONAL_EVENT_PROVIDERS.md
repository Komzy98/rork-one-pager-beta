# One Pager: additional event providers

All integrations are server-side. Never place their credentials in EXPO_PUBLIC variables.

Fienta: Official public country=GB REST endpoint, no credentials needed. Events missing verifiable UK postcode coordinates are excluded. Filters stale/long-running registrations.

Data Thistle: Obtain a licensed Publishing API JWT, then set DATATHISTLE_ACCESS_TOKEN on Railway. Endpoint: https://api.datathistle.com/v1/events. Confirm the commercial licence permits third-party redistribution.

Meetup: Obtain Meetup Pro access and OAuth bearer token. Set MEETUP_ACCESS_TOKEN and MEETUP_PRO_NETWORK (network urlname). Uses https://api.meetup.com/gql-ext. Fetches only authorised Pro network events, not all Meetup events.

Ents24: The public API schema repository is archived and obsolete. Obtain a current licensed endpoint and authentication contract. Configure ENTS24_EVENTS_URL and ENTS24_AUTHORIZATION from approved provider instructions. Adapter is inactive until configured; response contract needs an authenticated test.

GET /health/events/providers reports configuration flags without secrets. Configured is not equivalent to an authenticated working integration.

Automatic EAS builds and Apple submissions stay disabled.
