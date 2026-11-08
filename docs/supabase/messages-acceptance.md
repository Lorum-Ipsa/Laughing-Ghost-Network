# Direct messages Phase 1 acceptance

Private one-to-one text messages are available in **Ghost Space → Messages** and from a mutual connection in Network. A follow alone cannot send a message. Either Ghost can read the history after disconnecting, and reconnecting reopens the same conversation. Messages are stored in Supabase and protected by participant access rules. Phase 1 does not include attachments, group chat, read receipts, or end-to-end encryption.

Message notices follow the Collaboration preference and contain no message content. Opted-in browser push uses the existing generic alert. Realtime signals thread activity, while clients load bodies through the normal participant-scoped query.

- [x] Apply [the development migration](direct-messages.sql) to `lgn-development` as `20261108110619_phase1_direct_messages`. All 10 [rollback-only DM assertions](direct-messages-acceptance.sql) passed before and after rollout. The 25 Network and Notifications regression assertions also passed.
- [ ] Verify frontend build, typecheck, and the PocketBase-free route smoke test.
- [ ] Sign in as connected Ghosts A and B in separate browser sessions. Open Messages from Network, exchange synthetic text, and verify replies appear without refresh. Check that a third Ghost cannot read the thread.
- [ ] As B, follow the generic inbox notice to the correct conversation. Confirm the body is absent from the inbox and browser push preview.
- [ ] Disconnect as A. Confirm both Ghosts can still read the history and the server refuses new sends. Reconnect and confirm the same thread can receive new messages.
- [ ] Use a nonconnected account and a follow-only relationship to verify that neither permits sending. Check the latest page and older history navigation.
- [ ] Obtain final approval before merging or deploying to production.
