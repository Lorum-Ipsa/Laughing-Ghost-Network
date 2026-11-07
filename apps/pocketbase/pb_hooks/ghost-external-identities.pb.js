/// <reference path="../pb_data/types.d.ts" />

// Keeps ghost_external_identities in sync with a profile's free-text
// `external_links` field ("Platform: url" per line).
//
// The frontend still writes external_links as text; this hook reconciles the
// structured collection on every profile create/update so the collection is
// always current without requiring a frontend change. Reconciliation is
// key-based (platform + url): existing rows are preserved (keeping any future
// `verified` flag), new lines are added, and removed lines are deleted.

// syncIdentities is loaded by each isolated handler from pb_hooks/lib/syncIdentities.js

onRecordAfterCreateSuccess((e) => { require(`${__hooks}/lib/syncIdentities.js`).syncIdentities(e.app, e.record); e.next(); }, 'ghost_profiles');
onRecordAfterUpdateSuccess((e) => { require(`${__hooks}/lib/syncIdentities.js`).syncIdentities(e.app, e.record); e.next(); }, 'ghost_profiles');
