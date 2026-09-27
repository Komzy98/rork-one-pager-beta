# Habit Engine V2

Habit Engine V2 turns habit tracking into an adaptive behaviour-change loop.

The core product question is no longer "How long is the streak?" It is:

> What should One Pager do now to make the next repetition easier and more likely?

The engine separates observable behaviour from inferred learning. Follow-through is calculated from scheduled opportunities. Automaticity is measured directly with a short self-report check-in. Context consistency and intervention priority are internal decision aids, not presented as a scientifically precise "habit strength" score.

## Product loop

1. **Plan** a stable cue, first action, realistic window and minimum version.
2. **Cue** the user when the relevant context arrives.
3. **Act** with either the full behaviour or a minimum version.
4. **Observe** completion timing, missed opportunities and user-reported friction.
5. **Diagnose** recurring barriers and successful contexts.
6. **Adapt** the plan, but only after the user accepts a meaningful change.
7. **Repeat** while measuring automaticity every couple of weeks.
8. **Fade support** when automaticity and follow-through are strong.

## Research principles

V2 is based on several established findings rather than a single proprietary "habit score":

- Habit automaticity is distinct from streak length. The engine uses a 1–5 automaticity check-in based on the behavioural automaticity literature, including work validating short and single-item automaticity measures (PubMed 39324279).
- Repeating a behaviour in a stable context strengthens habit formation. This informs cue, context and timing design (PubMed 39225981 and 35756236).
- Implementation intentions and planning can improve follow-through. The onboarding therefore asks for a concrete cue and first action rather than a vague intention (PubMed 35742582 and 34054628).
- Problem solving and reducing friction matter for habit formation. The engine logs barriers and responds to recurring patterns rather than only sending reminders (PubMed 37700303).
- Tailored feedback is generally more useful than generic self-monitoring. The engine learns from the user's own completion timing and reported barriers (PubMed 34192411 and 38178230).
- Context changes can disrupt established habits. Fallbacks and minimum versions help protect repetition when the normal context breaks (PubMed 27120333).

Research informs the design, but V2 does not claim that its internal context or priority values are validated clinical or psychological scales.
## Data model

`Task.habitEngine` now stores a versioned `HabitEngineConfig`.

### Plan data

- `anchor`: the stable event that should cue the habit.
- `firstStep`: the smallest concrete initiation action.
- `location`: optional stable physical context.
- `windowStart/windowEnd`: preferred local time window.
- `minimumVersion`: smallest acceptable version of the behaviour.
- `fallback`: alternate action/context when the normal plan is unavailable.
- `obstacle`: anticipated barrier.
- `immediateReward`: optional immediate reinforcement.

### Learning data

- `automaticityCheckIns`: timestamped 1–5 automaticity ratings.
- `frictionLogs`: user-reported reasons for misses.
- `attemptLogs`: full vs minimum completions.
- `adaptationHistory`: accepted plan adaptations.
- `promptCadence`: high, normal or low.
- `lastInterventionAt`: latest engine interaction.

Arrays are bounded to prevent uncontrolled local/cloud payload growth.

## Measurement model

### Follow-through

A 28-day completion rate against actual scheduled opportunities.

This is shown as a percentage because it is directly calculated from the user's recorded schedule and completions.

### Context consistency

An internal heuristic based on:
- dispersion of recent completion times;
- alignment with the user's preferred window;
- whether a stable cue exists;
- optional location context.

The UI deliberately shows a qualitative label such as **Learning**, **Variable**, **Forming** or **Stable** instead of presenting the heuristic as a validated percentage.

### Recovery

Measures whether a missed scheduled opportunity is followed by completion at the next scheduled opportunity. It is primarily used internally for adaptation.

### Automaticity

The engine asks:

> "[Habit] is something I do automatically."

The user answers from 1 (not at all) to 5 (completely). V2 re-asks after approximately 14 days. The UI shows qualitative states such as **Needs effort**, **Getting easier**, **Mostly automatic** and **Feels automatic**.

### Habit phase

Phases are interpretable product states rather than a pseudo-scientific score:

- **Designing**: the habit plan is incomplete.
- **Starting**: fewer than five observed completions.
- **Building**: repetition exists but automaticity/context are not yet strong.
- **Becoming automatic**: stronger repeated follow-through plus contextual or automaticity evidence.
- **Automatic**: high self-reported automaticity alongside strong follow-through and stable context.
## Intervention logic

Each incomplete habit receives a priority score so One Pager surfaces one useful action rather than a wall of analytics.

Current priorities:

| Situation | Priority | Primary action |
| --- | ---: | --- |
| Planned window is open | 100 | Mark full behaviour done |
| Window passed + minimum exists | 92 | Do/record minimum version |
| Window passed without recovery plan | 88 | Review recovery plan |
| Automaticity check-in due | 76 | Answer 1–5 check-in |
| Learned adaptation available | 72 | Apply/review suggestion |
| V2 setup incomplete | 65 | Complete V2 onboarding |
| Window is approaching | 42 | Review plan |
| General plan-ahead state | 30 | Review plan |

The priorities are product decision weights, not psychological measurements.

## Adaptive algorithm

The first version of the adaptive layer is intentionally explainable.

### Repeated "wrong time"

If at least two recent misses are attributed to timing and at least four successful completion timestamps exist, the engine estimates the median success time. When it differs materially from the planned window, One Pager proposes a new 90-minute window around the observed success time.

The change is not applied until the user accepts it.

### Repeated "too tired" or "no time"

If a minimum version exists, One Pager recommends protecting repetition with that version. Otherwise it asks the user to create one.

### Repeated "forgot"

The engine recommends strengthening the cue and immediately linking the cue to the first physical action.

### Repeated "unexpected"

The engine surfaces the fallback. If none exists, it asks for a disruption plan.

### Repeated "low motivation"

The engine surfaces the planned immediate reward or suggests adding one.

### Strong automaticity + follow-through

When automaticity, follow-through and context are strong, One Pager proposes reducing prompts. The intended end-state of a successful Habit Engine is less dependence on the app, not more notifications.

## Card UX

The Overview card is now action-oriented.

It shows:
- the current habit phase;
- this week's completions vs target;
- cue and time context;
- objective follow-through;
- a qualitative context state;
- automaticity state;
- one specific recommendation;
- one learned insight when evidence exists;
- one primary action.

The primary button is functional:
- setup opens V2 onboarding;
- check-in opens the automaticity scale;
- "Mark done" records a full completion;
- "I did the minimum" records a minimum completion;
- accepted timing/prompt adaptations update the plan;
- other plan changes open the exact habit editor.

When a recent miss exists, **Log barrier** records the user's reason so the algorithm can learn.
## Onboarding

V2 uses a four-step setup:

1. **Choose the cue**
   - stable anchor/event;
   - first tiny action;
   - optional location.

2. **Choose the window**
   - optional start and end time;
   - cue-only habits may leave this blank.

3. **Plan for bad days**
   - minimum version;
   - likely obstacle;
   - optional fallback;
   - optional immediate reward.

4. **Baseline**
   - one 1–5 automaticity rating.

Existing V1 habits are migrated progressively. Their old anchor/window/fallback fields are pre-filled, but they remain in **Designing** until V2 setup is completed. Existing completion history is retained.

## User agency and guardrails

- Meaningful plan adaptations are recommendations, not silent behavioural changes.
- A new timing window is only persisted after explicit acceptance.
- Prompt reduction is only persisted after explicit acceptance.
- Friction categories are supplied by the user; the engine does not infer sensitive psychological states.
- Automaticity is self-reported rather than inferred from a streak.
- A minimum completion counts as completion while remaining distinguishable in `attemptLogs` and completion-log tags.
- The algorithm is deterministic and explainable; generative AI is not required for core decisions.

## Validation

Habit Engine V2 has focused automated tests covering:
- onboarding state;
- due-now action selection;
- minimum-version recovery;
- automaticity baseline and re-check timing;
- repeated timing-friction adaptation;
- minimum completion logging;
- explicit acceptance before window changes;
- intervention ranking.

TypeScript must pass with `npx tsc --noEmit`.

The repository's full legacy test suite currently contains three failures that reproduce unchanged on the `origin/main` baseline (`eventNightOutPlanner`, `footballKickoffLabel` and `savedEventsWeek`). They are unrelated to Habit Engine V2 and should be fixed separately.