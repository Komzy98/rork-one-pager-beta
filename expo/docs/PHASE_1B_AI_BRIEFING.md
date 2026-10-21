# Phase 1B — Opt-in LLM briefing enrichment

Built on Phase 1A's source-aware intelligence context. The normal daily briefing remains local and deterministic, with optional AI enrichment added asynchronously.

## User experience

In **Profile → Notifications**, enable **AI personalised briefing**. It is OFF by default and unavailable to guests. Habit and task titles are the default selected categories when someone enables the feature. Separate controls enable calendar, sports, saved events, shows, or weather. The explanatory copy names the categories being shared. Generate a *new* daily summary in Overview to obtain the extra “Personalised suggestion” section.

The existing recap, grounded achievements, scores, contextual facts, summaries, ElevenLabs audio, and regeneration actions remain intact. A generated insight is included in narration and sharing. Recovery Mode never sends its summary through the new path.

## Architecture

- Client builds a capped list of *incomplete* habits/tasks and selected, current contextual items. It never sends habit completion totals, sensitive notes, health data, account identity, or all of the device state to the AI.
- A dedicated authenticated tRPC client sends this small request using a bearer header (never query strings). The backend validates the Supabase session with `auth.getUser` *before* charging or calling the provider.
- The server uses OpenAI's Responses endpoint with `store: false`, structured outputs, and a strict item-ID schema. The model chooses the most relevant *existing* item and an approach; the backend constructs the factual text from the selected item. Thus free-text model hallucinations or adversarial user-generated titles cannot alter the factual narrative.
- Model secrets only belong in the **server environment**. The server uses a 7s timeout, 160 output tokens, 8 uncached model requests/user/hour, a 15-minute account-isolated in-memory cache and in-flight deduplication.
- The client displays the deterministic summary *first*. Optional enrichment has an 8.5s request timeout, no automatic retries, and never blocks app interactions. A regeneration counter, cache-signature check, dismissal check, date check and re-reading user opt-in settings prevent stale responses from replacing another summary or applying after opt-out.
- Source timestamps and Phase 1A stale/availability logic still govern which items may enter the model projection.

## Required production settings

Configure the **backend service** (not Expo/EAS) with:

- `AI_BRIEFING_ENABLED=true` — explicit feature rollout flag; otherwise it is disabled.
- `OPENAI_API_KEY=<server-only credential>` — must never use an `EXPO_PUBLIC_` prefix.
- `OPENAI_BRIEFING_MODEL=gpt-4.1-mini` — optional override; default shown.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or existing supported env equivalents) — to validate the caller's Supabase token.

Without those settings, One Pager still produces its regular local briefing, and the optional enrichment is unavailable. There is no new required client key. Do not log user content or keys.

## Tests and remaining validation

- Unit/regression: `node --import tsx --test utils/__tests__/*.test.ts`
- Static typing: `./node_modules/.bin/tsc --noEmit --pretty false`
- The AI tests cover opt-in data minimisation, stale source exclusion, correct account-scoped caching, model selection validation, missing/disabled provider and unauthenticated callers.

Before production rollout, verify deployed backend configuration, full signed-in iOS request, settings persistence after relaunch, offline operation, multiple account isolation, privacy-policy disclosures, and perceived latency under real network conditions. No deployment or TestFlight submission was performed in this branch.
