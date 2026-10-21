# Phase 1C — Intelligence validation and release gates

**Scope:** Strengthen and validate Phase 1B without changing One Pager's established navigation, adding AI tabs or triggering EAS / TestFlight.

## Implemented quality controls

1. **Privacy and account lifecycle.** The AI request re-checks locally persisted opt-in settings *after* resolving the Supabase session and before sending. The authenticated session ID must match the expected current user. Each transmitted category must still be permitted. Overview invalidates late requests and clears the previous account's daily briefing on account change or sign-out. Recovery Mode continues to bypass this AI path.
2. **Bounded provider latency.** The server now uses a true 7-second maximum promise deadline in addition to AbortSignal; a fetch implementation that ignores abort cannot keep the feature hanging. Failure/refusal, invalid structured output, timeout and provider errors all fall back without modifying the verified daily summary.
3. **Quality of generated claims.** The model can select **only an ID** from the verified, opt-in item list and an enum-style approach. The server, not the model, writes the final recommendation. It cannot synthesize a new sports result, attendance or completed habit.
4. **Cache correctness.** Model and prompt version now form part of the account-isolated cache key; changing models does not reuse incompatible cached suggestions. In-flight deduplication and per-account rate limiting remain in place.
5. **Privacy-safe diagnostics.** An optional backend-only `AI_BRIEFING_LOG_METRICS=true` writes `mode`, `cached`, and a **coarse latency band** (under 100 ms, under 1 s, under 3 s, under 7 s, over 7 s). It does not log user IDs, tokens, titles, notes, prompts or provider response bodies. Default is off.
6. **User disclosures.** Profile identifies OpenAI and directs users to the updated Privacy Policy. The policy explains selective opt-in, excluded data, how to opt out and the limits of `store: false`.
7. **CI validation.** A dedicated GitHub Actions quality workflow runs `npm test`, `tsc --noEmit`, and an **iOS JavaScript export only**. There is no App Store submission, signing or EAS build.

## Automated coverage

- Opt-in and per-category minimisation; stale-source exclusion
- User-bound cache, cache hit, model-version invalidation
- Provider timeout even with a non-aborting mock
- Invalid model selection, refusal and deterministic fallback
- No personal data in operational log messages
- tRPC authentication: rejected token never reaches the model; accepted token reaches a mocked provider
- Full existing regression suite and TypeScript typechecking
- iOS JS export validates Metro bundling **but is not a device runtime test**

## Manual iOS validation — REQUIRED before production enablement

Use a signed-in, consented QA account on an iOS simulator and TestFlight device when available:

- [ ] Open Overview after a cold start: ordinary daily briefing appears with no model or network wait.
- [ ] Keep AI turned **off**: verify no `ai.enrichBriefing` request is sent even if another source is loaded.
- [ ] Enable AI and generate: verify authentication, one grounded suggestion, source facts unchanged, working Listen to Audio and Share.
- [ ] Opt into calendar/sports/shows/events/weather **one at a time**: verify the request contains only the selected categories.
- [ ] Disable AI mid-request or change category permissions: late response must not add a suggestion or send a fresh request.
- [ ] Sign out or change account while an AI call is in flight: no old-account recap or insight may appear for the new account.
- [ ] Force offline, a 401, a 429, an invalid JSON/model response and a timeout: the deterministic summary remains functional with no UI freeze or repeated requests.
- [ ] Test stale sports/weather, no linked calendar, no tracked habits and Recovery Mode.
- [ ] Regenerate twice quickly: the older response may not replace the newer review; dismissing a review prevents late reinsertion.
- [ ] Verify that preferences survive an app relaunch and are isolated per account.
- [ ] Measure on a physical iPhone: initial deterministic summary target **under 300 ms after input is available**, no additional tab/interaction latency, optional suggestion target **under 8.5 seconds or graceful fallback**.
- [ ] Confirm the privacy disclosures and settings are readable with large Dynamic Type and VoiceOver.

## Deployment and rollout gates

1. Merge [Phase 1A PR #39](https://github.com/Komzy98/rork-one-pager-beta/pull/39) into `main`, then [Phase 1B PR #40](https://github.com/Komzy98/rork-one-pager-beta/pull/40). This Phase 1C branch is based on Phase 1B.
2. Verify that the **correct** Railway API service has server-only `OPENAI_API_KEY`, Supabase verification credentials, and `OPENAI_BRIEFING_MODEL` if an override is desired. Leave `AI_BRIEFING_ENABLED` **false** until iOS consent and latency tests pass.
3. Inspect diagnostic rate, provider failures, timeout distribution and cost under a small internal test cohort, then enable progressively.
4. Do not claim live model availability based only on a successful code merge, green CI or a healthy Railway service.
5. Add explicit operational retention/privacy review for any production telemetry or analytics beyond the optional coarse log metrics.

## Verification limitations (21 October 2026)

At Phase 1C implementation time, the linked Mac was **offline**, so no Xcode Simulator or signed-in iOS run was possible. Railway's production services were healthy and still pointed to `main`, which had not merged 1A/1B; a read of production environment variable names was denied by the Railway connector. Consequently **production AI readiness, live OpenAI responses and physical iOS performance have not been verified**.

The quality workflow is the executable code-level gate; its status must be checked on the Phase 1C pull request. These manual gates remain open until exercised with an accessible device and verified backend credentials.
