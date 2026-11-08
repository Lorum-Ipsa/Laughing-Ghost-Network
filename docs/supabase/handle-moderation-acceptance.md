# LGN: handle and moderated contribution acceptance

## New persistent handles

The new handle rules preserve case and allow ASCII letters/digits plus punctuation `._-!@#$&+~` and paired `//`. Length is 3–40 characters, with a letter or digit first. Examples: `Ghost!One`, `Night+Shift#42`, `Cyber.Lab`.

Uniqueness is case-insensitive: `Ghost!One` and `ghost!one` cannot both be claimed. Reserved and retired handles remain unavailable across casing changes. Previously created slash-containing handles remain valid. New handles may include the intentional `//` sequence, but not single slashes, `///`, spaces or unsupported punctuation. The URL path safely uses `~2F` for each slash, so `Laughing//Ghost` links to `/ghosts/Laughing~2F~2FGhost`. Handles are permanent; this does not rename an existing member.

To test the UI, register a **separate** test account using an address you control and a handle such as `Laughing//Ghost`. Verify the email, open Ghost Space, the public Ghost profile, and Search the Network. Check capitalization. A duplicate handle in a different case must be rejected at claim time.

## Browser acceptance for direct publication and review

Use a private Codespaces preview and the dedicated `lgn-development` project. This checklist requires both pending SQL changes in the order listed in the [publication policy](automated-moderation-policy.md). Confirm the preview points to development before submitting. Use two isolated browser sessions and synthetic content. Published fixtures are publicly readable through the development API.

| Session | Account |
| --- | --- |
| A | Verified, active member with a Ghost profile and no reviewer role |
| B | Separately verified member with a Ghost profile and an explicitly authorized reviewer role |
| Signed out | Visitor with no member session |

1. As A, open **Ghost Space → Contributions**. Save a draft, then click **Publish contribution**. Confirm it moves straight to **Published** with a success message. As a signed-out visitor, open the public work URL.
2. As A, publish a second contribution in the malware sample category. Use harmless markup-like source such as `<span data-lgn-qa>literal source</span>`. On the signed-out article, confirm the source displays literally and the browser inspector shows no element with the `data-lgn-qa` attribute.
3. As A, submit a new contribution containing `-----BEGIN PRIVATE KEY-----` followed by `synthetic QA fixture`. Confirm it appears under **In Review**, shows the possible credential or private-key concern, and is unavailable to the signed-out visitor.
4. Try opening **Ghost Space → Review** as A. Confirm access is denied. Open it as B, check the R301 finding, and verify that **Approve & publish** is unavailable before clearance.
5. As B, request revision with a reason. As A, confirm the reason appears, remove the synthetic marker, and resubmit. Confirm the corrected version publishes immediately and the visitor sees the revised work.
6. Repeat the held submission with a new fixture. As B, record a clearance reason and confirm it stays private. Then make a separate publish decision and confirm the work becomes visible to the visitor.
7. As B, submit a synthetic held fixture of your own. Confirm it is visible in the queue and the UI offers no action to review your own submission.

8. As A, delete a published fixture. Confirm the item disappears from Contributions, the Ghost profile, and its Research or Arsenal listing. The direct public article URL should return 404. Repeat with a held fixture and confirm it disappears from B's review queue.

Do not grant reviewer access to a real account for testing. Provision and revoke a dedicated test account's role only with explicit maintainer authorization.

## Database regression suites

- [Direct publication and targeted screening](targeted-publication-acceptance.sql)
- [Reviewer and publication authorization](reviewer-workflow-rls-acceptance.sql)
- [Contribution authorization and privacy](contributions-rls-acceptance.sql)
- [Handle validation](handle-validation-rls-acceptance.sql)
- [Historical v1 screening](rules-bot-triage-acceptance.sql), run before the new publication SQL.

The callable reviewer RPC is intentionally `SECURITY DEFINER` with strong server-side role, identity, owner, version and action checks. Supabase appropriately flags elevated callable functions for review; do not broaden its privileges without an independent security assessment. [Security advisory details](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
