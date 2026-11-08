# Direct messages Phase 1 acceptance

Private one-to-one text messages are available in **Ghost Space → Messages** and from a mutual connection in Network. A follow alone cannot send a message. Either Ghost can read the history after disconnecting, and reconnecting reopens the same conversation. New message bodies are encrypted in the browser before transmission. Supabase stores ciphertext and routing metadata. Older messages remain labeled as legacy plaintext. Attachments, group chat and read receipts are outside this scope.

Message notices follow the Collaboration preference and contain no message content. Opted-in browser push uses the existing generic alert. Realtime signals thread activity, while clients load bodies through the normal participant-scoped query.

- [x] Apply [the development migration](direct-messages.sql) to `lgn-development` as `20261108110619_phase1_direct_messages`. All 10 [rollback-only DM assertions](direct-messages-acceptance.sql) passed before and after rollout. The 25 Network and Notifications regression assertions also passed.
- [ ] Verify frontend build, typecheck, and the PocketBase-free route smoke test.
- [ ] Sign in as connected Ghosts A and B in separate browser sessions. Open Messages from Network, exchange synthetic text, and verify replies appear without refresh. Check that a third Ghost cannot read the thread.
- [ ] As B, follow the generic inbox notice to the correct conversation. Confirm the body is absent from the inbox and browser push preview.
- [ ] Disconnect as A. Confirm both Ghosts can still read the history and the server refuses new sends. Reconnect and confirm the same thread can receive new messages.
- [ ] Use a nonconnected account and a follow-only relationship to verify that neither permits sending. Check the latest page and older history navigation.
- [ ] Obtain final approval before merging or deploying to production.

## Encryption design and hands-on checks

LGN uses a browser-generated non-extractable P-256 key, ECDH and HKDF-SHA-256 for key agreement, and AES-256-GCM for authenticated encryption. The browser holds the private key in IndexedDB. Both Ghosts must enable encryption and compare a safety code over a separate trusted channel before composing or reading encrypted messages. The verified code is saved locally and a change blocks messaging.

- [ ] Enable encryption on two separate browser profiles. Refresh both, compare the displayed safety code through a separate trusted channel, and enter the other Ghost’s code. Verify that a wrong code prevents composing.
- [ ] Send a synthetic message both ways. Confirm both browsers display it, and check in browser developer tools that the send RPC carries an encrypted envelope. Verify the notification and browser push remain generic.
- [ ] Open the same account in another browser. Verify it cannot send or decrypt without the original key. Sign out and back in on the original browser and confirm the private key and verification still work.
- [ ] Confirm pre-existing messages remain labeled legacy plaintext, and that an older client sending plaintext receives a server error.
- [ ] Complete an independent security review before production deployment.

This version binds each Ghost to one browser profile. Clearing browser data removes the only private key and can make encrypted history inaccessible. Multi-device enrollment, key recovery, key rotation and forward secrecy are outside this version. Authentication depends on the out-of-band safety-code comparison and a trusted browser running the genuine LGN frontend.

- [x] Apply [the encryption migration](direct-messages-encryption.sql) to `lgn-development` as `20261108111504_phase1_dm_end_to_end_encryption`. All 14 DM assertions and 25 Network and Notifications regression assertions passed against the installed schema. Use the latest preview build for sending.
