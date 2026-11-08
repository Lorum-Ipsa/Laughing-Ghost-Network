# Network Phase 1 acceptance

The Supabase Network workspace discovers public Ghost profiles and links to recruiting Projects and open or scheduled Table Talks. Searches match public handles, display names, specialties, skills, tools, and industries. Each member can save search terms and the collaboration filter privately.

Collaboration requests are visible only to the active sending and receiving Ghosts. A recipient can accept or decline a pending request, and a sender can withdraw it. One pending request per pair is allowed. Acceptance records the decision in Network. This slice does not create a messaging channel or send a separate notification.

## Automated and hands-on checks

- [x] Apply [the Network migration](network-workspace.sql) to `lgn-development` as `20261108102108_phase1_network_workspace`. All nine [rollback-only checks](network-workspace-acceptance.sql) passed before and after rollout.
- [ ] Verify frontend build, typecheck, and the migrated-routes smoke check.
- [ ] As Ghost A, find Ghost B by handle and expertise, toggle collaboration availability, and save and reopen the search. Verify the search is absent from B's workspace.
- [ ] Send B a synthetic request. Confirm it appears under Sent for A and Received for B. Verify a third account cannot access it.
- [ ] Accept or decline as B and verify A sees the result. Send a separate request and withdraw it as A.
- [ ] Open a recruiting Project and a scheduled Table Talk from Network. Confirm private opportunities are absent.
- [ ] Reconcile historical PocketBase requests and searches from an approved export before removing the old paths. Obtain final approval before merge or production deployment.
