function audit(app, actor, action, targetType, targetId, details) {
  try {
    const col = app.findCollectionByNameOrId('ghost_audit_log');
    const rec = new Record(col);
    rec.set('actor', actor || '');
    rec.set('action', action);
    rec.set('target_type', targetType || '');
    rec.set('target_id', targetId || '');
    rec.set('details', details || '');
    app.save(rec);
  } catch (err) {
    app.logger().error('audit write failed', 'err', String(err));
  }
}

module.exports = { audit };
