# Network Phase 1 acceptance

The Supabase Network workspace discovers public Ghost profiles and links to recruiting Projects and open or scheduled Table Talks. Searches match public handles, display names, specialties, skills, tools, and industries. Each member can save search terms and the collaboration filter privately.

Collaboration requests are visible only to the active sending and receiving Ghosts. A recipient can accept or decline a pending request, and a sender can withdraw it. One pending request or active connection per pair is allowed. Acceptance adds a private, persistent connection to both Ghosts’ Network workspaces. Either Ghost can disconnect. The original request stays in history, and reconnecting requires a new accepted request. Connections do not create messaging channels or send notifications.

## Automated and hands-on checks

- [x] Apply [the Network migration](network-workspace.sql) to `lgn-development` as `20261108102108_phase1_network_workspace`. All nine [rollback-only checks](network-workspace-acceptance.sql) passed before and after rollout.
- [x] Apply [persistent connections](network-persistent-connections.sql) to `lgn-development` as `20261108102705_phase1_persistent_network_connections`. All 14 Network assertions passed before and after rollout.
- [ ] Verify frontend build, typecheck, and the migrated-routes smoke check.
- [ ] As Ghost A, find Ghost B by handle and expertise, toggle collaboration availability, and save and reopen the search. Verify the search is absent from B's workspace.
- [ ] Send B a synthetic request. Confirm it appears under Sent for A and Received for B. Verify a third account cannot access it.
- [ ] Accept as B and confirm both Ghosts see the connection after signing out and back in. Check that a repeat request is blocked. Disconnect as A and verify B no longer sees the connection, both retain the request history, and a new request can be sent. Also check decline and withdrawal.
- [ ] Open a recruiting Project and a scheduled Table Talk from Network. Confirm private opportunities are absent.
- [ ] Reconcile historical PocketBase requests and searches from an approved export before removing the old paths. Obtain final approval before merge or production deployment.
