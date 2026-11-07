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

**Do not replay** these directly on `lgn-development`. Resolve a reviewed Supabase CLI baseline before using them in a fresh staging environment. Future migrations should be generated and tested with the version of the CLI actually installed, with authorization and rollback tests.
