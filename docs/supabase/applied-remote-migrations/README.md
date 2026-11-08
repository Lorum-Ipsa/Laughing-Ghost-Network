# Applied remote migrations — historical source records

These files are exact statements exported from the **development project's** migration history, not instructions to run them again on that same database.

The initial identity foundation is an earlier **unversioned SQL snapshot**, located in [../identity-foundation.sql](../identity-foundation.sql). The first numbered remote migration `20261107205249_ghost_profile_self_lookup` is separately recorded in [../ghost-profile-self-lookup.sql](../ghost-profile-self-lookup.sql).

The remaining applied versions are recorded here:

| Version | Change |
| --- | --- |
| `20261107214928` | Confirmed-email requirement for Ghost profile writes |
| `20261107225329` | Public profile field expansion and RLS-protected contribution/revision tables |
| `20261107225449` | Correct contribution insert policy to use the owner-scoped profile link without exposing `owner_id` |
| `20261107230314` | Add profile contribution lookup index |
| `20261108073825` | Allow concise contributions: title plus any actual content without arbitrary minimum length |
| `20261108074923` | Preserve uppercase and safe punctuation in new Ghost handles; case-insensitive permanent reservation |
| `20261108075127` | Add private reviewer authorization, queue access, review decisions, audit records and restricted publication RPC |
| `20261108080058` | Consolidate review queue RLS access and index reviewer foreign keys |
| `20261108081455` | Allow literal `//` in new handles; forbid isolated or triple slashes |
| `20261108081854` | Event-triggered deterministic bot triage, reviewer investigation clearance and audit rules |

**Do not replay** these directly on `lgn-development`. Resolve a reviewed Supabase CLI baseline before using them in a fresh staging environment. Future migrations should be generated and tested with the version of the CLI actually installed, with authorization and rollback tests.

## Phase 1 development rollout

| Remote version | Migration | Ordered repository sources |
| --- | --- | --- |
| `20261108095951` | `phase1_contributions_workflow` | [Version guard](../review-version-guard.sql), [publishing and moderation](../publish-research-with-targeted-screening.sql), [materials](../contribution-publication-materials.sql) |
| `20261108100006` | `phase1_projects_workspace` | [Workspace](../projects-workspace.sql), [collaboration](../projects-collaboration.sql), [planning](../projects-planning.sql) |

Each row records a single development migration assembled from its linked SQL files in order. Do not replay them on the initialized development project. All 95 automated SQL assertions passed in rollback-only fixtures against the applied schema. Browser and production release acceptance remain pending.

Table Talks was installed on development as `20261108101201_phase1_table_talks_workspace` using [the workspace SQL](../table-talks-workspace.sql). The 13 rollback-only checks passed against the installed schema.

Network was installed on development as `20261108102108_phase1_network_workspace` from [the workspace SQL](../network-workspace.sql). Nine rollback-only checks passed against the installed schema.

Persistent Network connections were installed on development as `20261108102705_phase1_persistent_network_connections` from [the connection SQL](../network-persistent-connections.sql). The expanded 14-check Network suite passed against the installed schema.

Notifications was installed on development as `20261108103356_phase1_notifications_workspace` from [the workspace SQL](../notifications-workspace.sql). All 11 rollback-only checks passed against the installed schema.

Private follows were installed on development as `20261108104403_phase1_network_follows` from [the follow SQL](../network-follows.sql). The 10 follow checks and 25 existing Network and Notifications assertions passed against the installed schema.

Live notifications and browser push were installed on development as `20261108105342_phase1_live_notifications_and_push_queue` and `20261108105422_phase1_notification_push_dispatch`. Sources: [Realtime and queue](../notification-push.sql), [dispatcher](../notification-push-dispatch.sql), and the repository Edge Function. The dispatcher migration adds the named `lgn-push-dispatch` schedule pointing at the development function. HTTP dispatch returned 200 and created the VAPID pair in Vault.
