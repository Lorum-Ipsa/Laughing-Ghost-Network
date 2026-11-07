/// <reference path="../pb_data/types.d.ts" />

// Version history for ghost_work. Snapshots the content fields (title, summary,
// body, code, tags) on every create and on every update that actually changes
// one of those fields. Status-only or lifecycle-only updates do not create a
// revision, so the history reflects meaningful content changes, not noise.
//
// Revisions are written as superuser (bypassing the null createRule) and are
// deduplicated against the most recent revision: if the content fields are
// identical to the last snapshot, no new revision is created.

// snapshot is loaded by each isolated handler from pb_hooks/lib/snapshot.js

onRecordAfterCreateSuccess((e) => { require(`${__hooks}/lib/snapshot.js`).snapshot(e.app, e.record, 'initial'); e.next(); }, 'ghost_work');
onRecordAfterUpdateSuccess((e) => { require(`${__hooks}/lib/snapshot.js`).snapshot(e.app, e.record, 'edit'); e.next(); }, 'ghost_work');
