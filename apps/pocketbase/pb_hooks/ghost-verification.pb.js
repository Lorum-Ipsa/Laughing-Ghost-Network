/// <reference path="../pb_data/types.d.ts" />

// Brands the built-in email-verification email for the Laughing Ghost Network.
//
// Automated system emails (verification, password reset, notifications,
// account messages) are sent from no-reply@laughingghost.net with a Reply-To
// of support@laughingghost.net so replies reach a human inbox. The from
// display name carries the Laughing Ghost Network brand, the HTML body leads
// with the Laughing Ghost logo, a clear primary action button, and a
// fallback plain-text link, plus a plain-text alternative part.
//
// The site URL is set to https://laughingghost.net by the
// 1791378000_email_verification_flow migration, so the link returns the member
// to the published site. The /verify-email route calls
// `users.confirmVerification(token)` which is the only client-reachable path
// that sets `verified = true` — the field itself is locked against direct
// client changes (see the migration).
//
// NOTE: PocketBase concatenates every pb_hooks/*.pb.js file into one JSVM
// scope, so all constants and helpers MUST live inside the callback to avoid
// duplicate-identifier panics across files.

onMailerRecordVerificationSend((e) => {
  const LOGO_URL = 'https://horizons-cdn.hostinger.com/10773295-e010-4811-a2c6-4d11540001ee/6c0fc34b80dea891b36261613eb86347.png';
  const FROM_ADDRESS = 'no-reply@laughingghost.net';
  const REPLY_TO = 'support@laughingghost.net';

  const appUrl = $app.settings().meta.appUrl.replace(/\/$/, '');
  const link = appUrl + '/verify-email?token=' + e.meta.token;

  const contentHtml =
    '<h1 style="margin:0 0 16px;font-family:\'Barlow Condensed\',Arial,sans-serif;font-size:28px;font-weight:600;color:#eef0e8;">Verify your email</h1>' +
    '<p style="margin:0 0 20px;font-size:14px;line-height:1.8;color:#b9c2b6;">Welcome to the Laughing Ghost Network. Confirm your email address to activate your Ghost account and unlock publishing, projects, and Table Talks.</p>' +
    '<p style="margin:28px 0;"><a href="' + link + '" style="display:inline-block;background:#8fd9a6;color:#0a0f0e;font-size:13px;font-weight:650;padding:14px 26px;border-radius:3px;text-decoration:none;">Verify email</a></p>' +
    '<p style="margin:0;font-size:12px;line-height:1.8;color:#8a9489;">If the button does not work, copy and paste this link into your browser:</p>' +
    '<p style="margin:6px 0 0;font-size:11px;line-height:1.6;color:#8fd9a6;word-break:break-all;">' + link + '</p>' +
    '<p style="margin:24px 0 0;font-size:12px;line-height:1.8;color:#8a9489;">If you did not create an account on Laughing Ghost Network, you can ignore this message.</p>';

  const contentText =
    'Verify your email\n\n' +
    'Welcome to the Laughing Ghost Network. Confirm your email address to activate your Ghost account and unlock publishing, projects, and Table Talks.\n\n' +
    'Verify your email: ' + link + '\n\n' +
    'If you did not create an account on Laughing Ghost Network, you can ignore this message.';

  e.message.from.name = 'Laughing Ghost Network';
  e.message.from.address = FROM_ADDRESS;
  e.message.headers = e.message.headers || {};
  e.message.headers['Reply-To'] = REPLY_TO;
  e.message.subject = 'Verify your Ghost email';
  e.message.html =
    '<div style="background:#0a0f0e;padding:32px 0;font-family:Manrope,Arial,sans-serif;color:#eef0e8;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111814;border:1px solid #2a322e;border-radius:6px;overflow:hidden;">' +
        '<tr><td style="padding:28px 32px 8px;border-bottom:1px solid #2a322e;">' +
          '<img src="' + LOGO_URL + '" alt="Laughing Ghost Network" width="40" height="42" style="display:block;width:40px;height:42px;object-fit:cover;object-position:50% 36%;"/>' +
          '<p style="margin:14px 0 0;font-family:\'Barlow Condensed\',Arial,sans-serif;font-size:18px;font-weight:600;letter-spacing:.14em;color:#eef0e8;">LAUGHING GHOST <span style="color:#8fd9a6;">NETWORK</span></p>' +
        '</td></tr>' +
        '<tr><td style="padding:28px 32px 36px;">' + contentHtml + '</td></tr>' +
        '<tr><td style="padding:18px 32px;border-top:1px solid #2a322e;">' +
          '<p style="margin:0;font-size:11px;line-height:1.8;color:#8a9489;">Laughing Ghost Network · Independent by choice. Ethical by principle.</p>' +
          '<p style="margin:6px 0 0;font-size:11px;line-height:1.8;color:#8a9489;">Reply to this email at <a href="mailto:' + REPLY_TO + '" style="color:#8fd9a6;">' + REPLY_TO + '</a>.</p>' +
        '</td></tr>' +
      '</table>' +
    '</div>';
  e.message.text =
    'LAUGHING GHOST NETWORK\n\n' +
    contentText + '\n\n' +
    'Laughing Ghost Network — Independent by choice. Ethical by principle.\n' +
    'Reply: ' + REPLY_TO + '\n';

  e.next();
}, 'users');
