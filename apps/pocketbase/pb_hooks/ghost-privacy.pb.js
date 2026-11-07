/// <reference path="../pb_data/types.d.ts" />
onRecordEnrich((e) => {
  const auth = e.requestInfo.auth;
  if (!auth || (auth.id !== e.record.getString('owner') && !auth.getBool('moderator'))) e.record.hide('owner');
  e.next();
}, 'ghost_profiles', 'ghost_work', 'ghost_external_identities', 'ghost_notifications');

onMailerRecordPasswordResetSend((e) => {
  const appUrl = $app.settings().meta.appUrl.replace(/\/$/, '');
  const base = appUrl.includes('/hcgi/platform') ? appUrl : appUrl + '/hcgi/platform';
  const link = base + '/_/#/auth/confirm-password-reset/' + e.meta.token;
  e.message.from.name = 'Laughing Ghost Network';
  e.message.subject = 'Reset your Ghost access';
  e.message.html = '<p>A reset request was received for your Ghost account.</p><p><a href="' + link + '">Choose a new password</a></p><p>If you did not initiate this request, ignore this message.</p>';
  e.next();
}, 'users');
