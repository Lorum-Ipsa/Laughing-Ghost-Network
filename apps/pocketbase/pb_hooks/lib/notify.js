function notify(app, owner, type, title, body, link, relatedWork) {
  if (!owner) return;
  try {
    let filter = 'owner = {:owner} && type = {:type}';
    const params = { owner, type };
    if (relatedWork) {
      filter += ' && related_work = {:rw}';
      params.rw = relatedWork;
    }
    const existing = app.findRecordsByFilter('ghost_notifications', filter, '-created', 1, 0, params);
    if (existing.length > 0) return; // idempotent — already notified

    const col = app.findCollectionByNameOrId('ghost_notifications');
    const rec = new Record(col);
    rec.set('owner', owner);
    rec.set('type', type);
    rec.set('title', title);
    rec.set('body', body || '');
    rec.set('link', link || '');
    rec.set('read', false);
    if (relatedWork) rec.set('related_work', relatedWork);
    app.save(rec);
  } catch (err) {
    app.logger().error('notify failed', 'type', type, 'err', String(err));
  }
}

module.exports = { notify };
