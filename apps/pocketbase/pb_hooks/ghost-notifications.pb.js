/// <reference path="../pb_data/types.d.ts" />

// Generates private member notifications for the Laughing Ghost Network.
//
// Notifications are written as superuser (bypassing the null createRule) and
// are deduplicated per (owner, type, related_work) so re-saving a published
// contribution or re-processing an application never produces duplicates.
//
// Events:
//   - ghost_profiles create           → welcome (non-example profiles only)
//   - ghost_work update → published   → work_published (to the contributor)
//   - ghost_work update → rejected     → work_rejected  (to the contributor)
//   - ghost_participations create     → participation_received (to the work owner)
//   - ghost_applications update       → application_accepted / application_declined

// notify is loaded by each isolated handler from pb_hooks/lib/notify.js

// Welcome a new Ghost (skip seeded example profiles).
onRecordAfterCreateSuccess((e) => {
  if (e.record.getBool('example')) { e.next(); return; }
  const owner = e.record.getString('owner');
  const handle = e.record.getString('handle');
  require(`${__hooks}/lib/notify.js`).notify(
    e.app,
    owner,
    'welcome',
    'Welcome to the network',
    'Your Ghost profile "' + handle + '" is live. Complete it in Ghost Space to build your evidence.',
    '/ghost-space',
    '',
  );
  e.next();
}, 'ghost_profiles');

// Contribution published / rejected.
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.getString('status');
  const owner = e.record.getString('owner');
  const id = e.record.id;
  const title = e.record.getString('title');
  if (status === 'published') {
    require(`${__hooks}/lib/notify.js`).notify(
      e.app,
      owner,
      'work_published',
      'Contribution published',
      'Your contribution "' + title + '" is now live in the network.',
      '/work/' + id,
      id,
    );
  } else if (status === 'rejected') {
    require(`${__hooks}/lib/notify.js`).notify(
      e.app,
      owner,
      'work_rejected',
      'Contribution not published',
      'Your contribution "' + title + '" was not published. See the Code page for the moderation process.',
      '/account',
      id,
    );
  }
  e.next();
}, 'ghost_work');

// Someone asked to join a project or Table Talk.
onRecordAfterCreateSuccess((e) => {
  const app = e.app;
  const participant = e.record.getString('owner');
  const workId = e.record.getString('work');
  if (!workId) { e.next(); return; }
  try {
    const work = app.findRecordById('ghost_work', workId);
    const workOwner = work.getString('owner');
    const workTitle = work.getString('title');
    if (workOwner && workOwner !== participant) {
      require(`${__hooks}/lib/notify.js`).notify(
        app,
        workOwner,
        'participation_received',
        'New participation request',
        'A Ghost asked to join "' + workTitle + '". Review it in your workspace.',
        '/account#participations',
        workId,
      );
    }
  } catch (err) {
    app.logger().error('participation notify failed', 'err', String(err));
  }
  e.next();
}, 'ghost_participations');

// Membership application accepted / declined.
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.getString('status');
  const owner = e.record.getString('owner');
  const handle = e.record.getString('handle');
  if (status === 'accepted') {
    require(`${__hooks}/lib/notify.js`).notify(
      e.app,
      owner,
      'application_accepted',
      'Welcome to the network',
      'Your Ghost profile "' + handle + '" is now a member.',
      '/ghost-space',
      '',
    );
  } else if (status === 'declined') {
    require(`${__hooks}/lib/notify.js`).notify(
      e.app,
      owner,
      'application_declined',
      'Application update',
      'Your membership application was not accepted at this time.',
      '/account',
      '',
    );
  }
  e.next();
}, 'ghost_applications');

// Collaboration request received — notify the recipient profile's owner.
onRecordAfterCreateSuccess((e) => {
  const app = e.app;
  const sender = e.record.getString('owner');
  const recipientId = e.record.getString('recipient');
  const requestType = e.record.getString('request_type');
  const message = e.record.getString('message');
  if (!recipientId) { e.next(); return; }
  try {
    const recipient = app.findRecordById('ghost_profiles', recipientId);
    const recipientOwner = recipient.getString('owner');
    if (recipientOwner && recipientOwner !== sender) {
      const typeLabel = requestType ? requestType.replace(/_/g, ' ') : 'collaboration';
      require(`${__hooks}/lib/notify.js`).notify(
        app,
        recipientOwner,
        'collaboration_request_received',
        'Collaboration request',
        'A Ghost requested ' + typeLabel + ': ' + (message || '').slice(0, 180),
        '/ghost-space?section=network',
        '',
      );
    }
  } catch (err) {
    app.logger().error('collaboration notify failed', 'err', String(err));
  }
  e.next();
}, 'ghost_collaboration_requests');

// Collaboration request status update — notify the sender.
onRecordAfterUpdateSuccess((e) => {
  const status = e.record.getString('status');
  const sender = e.record.getString('owner');
  if (status !== 'accepted' && status !== 'declined') { e.next(); return; }
  require(`${__hooks}/lib/notify.js`).notify(
    e.app,
    sender,
    'collaboration_request_updated',
    status === 'accepted' ? 'Collaboration accepted' : 'Collaboration declined',
    status === 'accepted'
      ? 'A Ghost accepted your collaboration request.'
      : 'A Ghost declined your collaboration request.',
    '/ghost-space?section=network',
    '',
  );
  e.next();
}, 'ghost_collaboration_requests');

// Review received — notify the work owner when a review is published.
onRecordAfterCreateSuccess((e) => {
  const app = e.app;
  const status = e.record.getString('status');
  if (status !== 'published') { e.next(); return; }
  const workId = e.record.getString('work');
  const verdict = e.record.getString('verdict');
  if (!workId) { e.next(); return; }
  try {
    const work = app.findRecordById('ghost_work', workId);
    const workOwner = work.getString('owner');
    const workTitle = work.getString('title');
    if (workOwner) {
      require(`${__hooks}/lib/notify.js`).notify(
        app,
        workOwner,
        'review_received',
        'New review on your contribution',
        'A reviewer left a "' + verdict + '" verdict on "' + workTitle + '".',
        '/work/' + workId,
        workId,
      );
    }
  } catch (err) {
    app.logger().error('review notify failed', 'err', String(err));
  }
  e.next();
}, 'ghost_reviews');

// Review published after being a draft — notify the work owner of feedback.
onRecordAfterUpdateSuccess((e) => {
  const app = e.app;
  const status = e.record.getString('status');
  if (status !== 'published') { e.next(); return; }
  const workId = e.record.getString('work');
  const verdict = e.record.getString('verdict');
  if (!workId) { e.next(); return; }
  try {
    const work = app.findRecordById('ghost_work', workId);
    const workOwner = work.getString('owner');
    const workTitle = work.getString('title');
    if (workOwner) {
      require(`${__hooks}/lib/notify.js`).notify(
        app,
        workOwner,
        'review_feedback',
        'Reviewer feedback available',
        'Feedback ("' + verdict + '") is available on "' + workTitle + '".',
        '/work/' + workId,
        workId,
      );
    }
  } catch (err) {
    app.logger().error('review feedback notify failed', 'err', String(err));
  }
  e.next();
}, 'ghost_reviews');
