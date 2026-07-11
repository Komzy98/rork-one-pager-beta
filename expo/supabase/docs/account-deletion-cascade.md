# Account deletion — social data cascade

When a user deletes their account (`auth.users` row removed), Postgres `ON DELETE CASCADE` cleans up most social data automatically. Partners may still see **cached or denormalized remnants** until they refresh.

## Automatically deleted (cascade from `auth.users`)

| Table | What goes away |
|-------|----------------|
| `profiles` | Username, streak, avatar URL, visibility flags, last active |
| `friendships` | Both directions of partner links |
| `friend_requests` | Pending/historical requests involving the user |
| `nudges` | Sent and received nudges |
| `activity_events` | Feed posts (habits, events, milestones) |
| `activity_reactions` | Cheers the user gave; cheers **on their posts** go with the event |
| `shared_plans` | Plans they owned |
| `plan_rsvps` | Their RSVPs on any plan |
| `plan_access_grants` | Invite grants they claimed |
| `user_event_saves` | Partner-visible saved event snapshots |
| `user_data` | Cloud-synced profile JSON |
| `community_habits` | UGC habits they published |
| `community_saves` / `community_likes` | Their save/like ledger rows |

## What partners may still see (temporary / denormalized)

| Surface | Why it can linger | Mitigation |
|---------|-------------------|------------|
| **Cached avatars** | `expo-image` / OS HTTP cache for `avatar_url` | URLs stop updating; cache expires naturally. Storage objects in `avatars` bucket are not auto-deleted by SQL cascade — run a storage cleanup job if required. |
| **Old cheers count** | Optimistic UI or stale React Query feed | Realtime + refresh drops events once cascade completes. |
| **Feed author labels** | In-memory feed before invalidation | Pull-to-refresh on Overview / Partners. |
| **Guest RSVPs** | `guest_rsvps` rows are not tied to `auth.users` | Web guests remain listed by display name until manually cleared. |
| **Community habit stats** | Counter row may remain until habit row deleted | Deleting `community_habits` triggers cleanup of stats/saves/likes for that habit id. |
| **Invite links** | HTTPS links with `ptoken` / `from` | Token becomes useless once `shared_plans` row is gone; grant rows cascade. |

## Partner-visible after unfriend (not deletion)

Unfriend removes `friendships` and requests but **does not** delete historical `activity_events` or cheers already visible under prior visibility rules. Use **Go private** before unfriending if you need to stop new reads; existing rows remain until the account is deleted or visibility policies hide them.

## Operational checklist

1. Confirm `auth.users` delete uses Supabase Auth admin API (cascades fire).
2. Optionally purge `avatars/{userId}` objects in Storage after delete.
3. Document for support: partners who still see a ghost name usually need one app refresh.
