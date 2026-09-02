# One Pager visual system

This document is the product UI contract for the simplified One Pager architecture.

## Core principle

The four primary tabs should feel like **different rooms in the same house**.

- **Today** — time + atmosphere. The app is alive to what matters now.
- **My Life** — state + organisation. Persistent parts of the user's world show momentum and drift.
- **Discover** — imagery + possibility. New things can be expressive, but recommendations stay selective.
- **You** — identity + control. Calm, personal and low-noise.

Do not solve differentiation by inventing a new design language inside each tab.

## Screen grammar

Primary screens use this order unless there is a strong product reason not to:

1. `PageHeader`
2. one hero/context surface at most
3. primary content
4. secondary content
5. deeper navigation

Screen horizontal padding is `20` and major sections use the shared `32` spacing token.

## Typography

Use `OP_TYPE` from `constants/onePagerDesign.ts`.

- Page title — 32
- Hero statement — 24
- Section title — 21
- Card title — 16
- Body — 14
- Metadata — 12
- Eyebrow/status — 10

Do not create a new headline size for an isolated feature. If the hierarchy cannot be expressed with these roles, reconsider the hierarchy before adding another token.

## Surfaces

There are three primary surface types:

- `SurfaceCard variant="hero"` — one focal surface, radius 24.
- `SurfaceCard` — normal card, radius 18.
- `SurfaceCard variant="list"` — grouped list rows with one outer surface.

Avoid feature-specific card shells when one of these is sufficient.

## Colour

**One Pager blue means action, selection, navigation or contextual intelligence.**

Domain colours identify a part of life, but should usually be limited to:

- icons
- small indicators
- eyebrows
- status treatments

Do not flood full cards with domain colour unless the content genuinely needs a strong branded/visual moment.

Domain tokens are defined in `OP_DOMAIN`.

## Status language

Use `StatusPill` for persistent state such as:

- STRONG
- IN MOTION
- NEXT UP
- COMING UP
- GOING STALE
- NEEDS ATTENTION

The words can differ by domain; the visual treatment should not.

## ContextCue

`ContextCue` is the recognisable One Pager intelligence primitive.

Examples:

- WORTH KNOWING — Late workdays are when this routine usually slips.
- OPEN WINDOW — You have 52 minutes before your next meeting.
- FITS YOUR EVENING — This event fits a genuinely free evening.
- SCHEDULE CONFLICT — Two commitments overlap by 30 minutes.
- LOSING MOMENTUM — A routine has gone quiet.

### Sparkles rule

Sparkles mean **One Pager made a connection for the user**.

Do not use Sparkles as generic decoration, section branding or a synonym for AI.

## Buttons

Use `ActionButton` hierarchy:

- primary — the main action (`Add to my life`)
- secondary — supporting action (`Details`)
- tertiary — low-emphasis action (`Not tonight`)

Do not introduce gradient buttons, pill CTAs or custom button geometry for ordinary product actions.

## Lists

Use `ListRow` for calendar items, recommendations, settings, saved plans and other compact navigational state.

Rows should be preferred over stacking multiple small cards when the content belongs to one conceptual group.

## Intelligence

AI is a reasoning layer, not a visual theme.

Do not add generic `AI Insight`, `AI Coach`, `Powered by AI` or brain/sparkle cards simply to expose generated text.

Intelligence should appear as a normal product outcome:

- priority
- timing
- conflict
- open window
- recommendation reason
- weekly pattern
- evening plan
- concise day review

If there is no useful output, render nothing.

## Primary-tab contracts

### Today

Question: **What matters now?**

May combine calendar, important tasks, routines, saved plans, sports, weather, Continue Watching and a highly selective opportunity. It should synthesise them into a short briefing and rhythm rather than render one section per data source.

### My Life

Question: **What state is my life in?**

Show persistent domains and their state: focus, momentum, staleness, next-up item and supporting count. My Life is not another Today feed and not a directory of shortcuts.

### Discover

Question: **What is worth adding?**

Only new possibilities. Prefer one excellent hero and a short secondary list over an endless recommendation feed. Things already chosen move to My Life.

### You

Question: **What should One Pager understand or let me control?**

Keep the primary tab calm. Identity and key personalisation signals are visible; detailed settings can live one level deeper.

## Definition of done for a new primary UI

Before merging a new primary feature, check:

- Does it use the shared 20px gutter and typography roles?
- Can an existing SurfaceCard/ListRow represent it?
- Does its colour mean the same thing as elsewhere?
- If it uses Sparkles, did One Pager actually make a contextual connection?
- Is the primary action using the shared button hierarchy?
- Is it duplicating another tab's job rather than sharing data appropriately?
- Does it reduce or increase the number of competing visual languages on the screen?

Prefer removing a local style over adding a new one.
