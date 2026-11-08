# LGN: handle and moderated contribution acceptance

## New persistent handles

The new handle rules preserve case and allow ASCII letters/digits plus punctuation `._-!@#$&+~`. Length is 3–40 characters, with a letter or digit first. Examples: `Ghost!One`, `Night+Shift#42`, `Cyber.Lab`.

Uniqueness is case-insensitive: `Ghost!One` and `ghost!one` cannot both be claimed. Reserved and retired handles remain unavailable across casing changes. Previously created slash-containing handles are preserved, but new handles cannot contain slash, spaces or characters outside the allowed set. Handles are permanent; this does not rename an existing member.

To test the UI, register a **separate** test account using an address you control and a punctuated mixed-case handle. Verify the email, open Ghost Space, the public Ghost profile, and Search the Network. Check capitalization. A duplicate handle in a different case must be rejected at claim time.

## Reviewer permissions and decisions

LGN now provides a role-restricted **Review queue** within Ghost Space. Reviewers can read submitted (not draft) work, request a revision with feedback, reject with feedback, or approve and publish. Authors can view their review notes and resubmit. Approved work is publicly visible on the author's profile and at `/work/:id`.

Review access is checked against `lgn_private.member_access`, where reviewer, moderator and admin are the only eligible roles, and suspension and email-confirmation are enforced. Users **cannot self-assign a role**, and **cannot review their own work**. All review decisions are version-checked and stored in `ghost_contribution_reviews`.

**No real account has been assigned a reviewer role yet.** A separate test account must receive that role through an explicitly approved privileged administrative action before full browser acceptance. Do not automatically promote the first registered user.

### End-to-end review test

1. Member A submits a harmless test contribution.
2. Separately verified member B, assigned the reviewer role by an authorized operator, signs in and sees the Review queue. Member A cannot access it.
3. B opens A's submission and requests revision, providing a note.
4. A sees the feedback under **Contributions → Needs Revision**, edits the work, and resubmits.
5. B approves the revised version. A signed-out visitor should now see the work on A's public profile and its article page.
6. Repeat a rejection with feedback. Attempt self-review, stale-version review and suspended-reviewer actions; each must be denied.

Use only fictional, authorized test content: approval makes content public. Existing member records were not altered by backend testing. Production still needs browser-level multi-account acceptance, hardening and staging.

## Regression evidence

- [6 handle validation checks](handle-validation-rls-acceptance.sql) — passed, rollback only.
- [18 reviewer and publication checks](reviewer-workflow-rls-acceptance.sql) — passed, rollback only.
- [14 existing contribution checks](contributions-rls-acceptance.sql) — still passed after the changes.

The callable reviewer RPC is intentionally `SECURITY DEFINER` with strong server-side role, identity, owner, version and action checks. Supabase appropriately flags elevated callable functions for review; do not broaden its privileges without an independent security assessment. [Security advisory details](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
