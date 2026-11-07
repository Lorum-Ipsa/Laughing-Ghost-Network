function snapshot(app, record, reason) {
  try {
    const workId = record.id;
    const owner = record.getString('owner');

    let last = [];
    try {
      last = app.findRecordsByFilter('ghost_revisions', 'work = {:w}', '-created', 1, 0, { w: workId });
    } catch (_) { /* collection absent or empty */ }

    // Dedupe: skip if content is identical to the last revision.
    if (last.length > 0) {
      const l = last[0];
      if (
        l.getString('title') === record.getString('title') &&
        l.getString('summary') === record.getString('summary') &&
        l.getString('body') === record.getString('body') &&
        l.getString('code') === record.getString('code') &&
        l.getString('tags') === record.getString('tags')
      ) {
        return;
      }
    }

    const version = last.length > 0 ? (last[0].getInt('version') || 0) + 1 : 1;
    const col = app.findCollectionByNameOrId('ghost_revisions');
    const rec = new Record(col);
    rec.set('owner', owner);
    rec.set('work', workId);
    rec.set('title', record.getString('title'));
    rec.set('summary', record.getString('summary'));
    rec.set('body', record.getString('body'));
    rec.set('code', record.getString('code'));
    rec.set('tags', record.getString('tags'));
    rec.set('version', version);
    rec.set('reason', reason || '');
    app.save(rec);
  } catch (err) {
    app.logger().error('revision snapshot failed', 'err', String(err));
  }
}

module.exports = { snapshot };
