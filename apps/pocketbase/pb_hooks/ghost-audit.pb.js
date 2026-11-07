/// <reference path="../pb_data/types.d.ts" />

// Audit logging for important moderation and account actions. Entries are
// written as superuser (bypassing the null createRule) and record the actor,
// the action, the target, and a short human-readable detail string.
//
// Audited events:
//   - ghost_work status → published / rejected / archived / revision_requested
//   - ghost_applications status → accepted / declined
//   - ghost_handle_changes status → approved / declined
//   - ghost_reports create (a report was submitted)
//
// Role changes on users are audited via the before/after comparison below so a
// privilege escalation is always recorded.

// audit is loaded by each isolated handler from pb_hooks/lib/audit.js

// Contribution moderation decisions.
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.getString('status');
  const owner = e.record.getString('owner');
  const id = e.record.id;
  const title = e.record.getString('title');
  if (['published', 'rejected', 'archived', 'revision_requested'].includes(status)) {
    require(`${__hooks}/lib/audit.js`).audit(e.app, owner, 'work_' + status, 'ghost_work', id, '"' + title + '" → ' + status);
  }
  e.next();
}, 'ghost_work');

// Soft-delete / restore of a contribution — a moderation action that hides or
// recovers content without a hard delete. Captured via the *Request variant so
// the actor (the admin/moderator, not the contribution owner) and the direction
// of the change are recorded exactly once, on the change itself.
onRecordUpdateRequest((e) => {
  const newDeleted = e.requestInfo.body['deleted'];
  if (newDeleted !== undefined) {
    const auth = e.requestInfo.auth;
    const actorId = auth ? auth.id : '';
    const title = e.record.getString('title');
    if (!!newDeleted) {
      require(`${__hooks}/lib/audit.js`).audit(e.app, actorId, 'soft_delete', 'ghost_work', e.record.id, 'Soft-deleted "' + title + '"');
    } else {
      require(`${__hooks}/lib/audit.js`).audit(e.app, actorId, 'work_restored', 'ghost_work', e.record.id, 'Restored "' + title + '"');
    }
  }
  e.next();
}, 'ghost_work');

// Soft-delete / restore of a Ghost profile — a moderation action that hides or
// recovers a member's public identity. Recorded against the acting admin/mod.
onRecordUpdateRequest((e) => {
  const newDeleted = e.requestInfo.body['deleted'];
  if (newDeleted !== undefined) {
    const auth = e.requestInfo.auth;
    const actorId = auth ? auth.id : '';
    const handle = e.record.getString('handle');
    require(`${__hooks}/lib/audit.js`).audit(
      e.app, actorId, 'soft_delete', 'ghost_profiles', e.record.id,
      !!newDeleted ? 'Soft-deleted profile "' + handle + '"' : 'Restored profile "' + handle + '"',
    );
  }
  e.next();
}, 'ghost_profiles');

// Membership application decisions.
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.getString('status');
  if (['accepted', 'declined'].includes(status)) {
    require(`${__hooks}/lib/audit.js`).audit(e.app, e.record.getString('owner'), 'application_' + status, 'ghost_applications', e.record.id, 'handle: ' + e.record.getString('handle'));
  }
  e.next();
}, 'ghost_applications');

// Handle-change request decisions.
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.getString('status');
  if (['approved', 'declined'].includes(status)) {
    require(`${__hooks}/lib/audit.js`).audit(e.app, e.record.getString('owner'), 'handle_change_' + status, 'ghost_handle_changes', e.record.id,
      e.record.getString('current_handle') + ' → ' + e.record.getString('requested_handle'));
  }
  e.next();
}, 'ghost_handle_changes');

// A report was submitted.
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib/audit.js`).audit(e.app, e.record.getString('owner'), 'report_submitted', 'ghost_reports', e.record.id, e.record.getString('subject'));
  e.next();
}, 'ghost_reports');

// Role / moderator privilege changes on users. Captured by comparing the
// stored record against the incoming request body so an escalation is logged
// exactly once, on the change itself.
onRecordUpdateRequest((e) => {
  const auth = e.requestInfo.auth;
  const actorId = auth ? auth.id : '';
  const newRole = e.requestInfo.body['role'];
  const newMod = e.requestInfo.body['moderator'];
  const newSuspended = e.requestInfo.body['suspended'];
  const oldRole = e.record.getString('role');
  const oldMod = e.record.getBool('moderator');
  const oldSuspended = e.record.getBool('suspended');
  if (newRole !== undefined && String(newRole) !== oldRole) {
    require(`${__hooks}/lib/audit.js`).audit(e.app, actorId, 'role_changed', 'users', e.record.id, 'role: ' + oldRole + ' → ' + newRole);
  }
  if (newMod !== undefined && !!newMod !== oldMod) {
    require(`${__hooks}/lib/audit.js`).audit(e.app, actorId, 'role_changed', 'users', e.record.id, 'moderator: ' + oldMod + ' → ' + !!newMod);
  }
  if (newSuspended !== undefined && !!newSuspended !== oldSuspended) {
    require(`${__hooks}/lib/audit.js`).audit(e.app, actorId, 'account_suspended', 'users', e.record.id,
      'suspended: ' + oldSuspended + ' → ' + !!newSuspended);
  }
  e.next();
}, 'users');
