# LGN automated moderation policy — rules bot v1

LGN's initial moderation bot is an **event-triggered deterministic rules engine**, not an AI model. It runs immediately when a contribution is submitted or resubmitted. Each evaluation is stored for the exact contribution version with a stable rule ID and recommended disposition.

## Explicit rule matrix

| ID | Trigger | Recommendation | Human requirement |
| --- | --- | --- | --- |
| R001 | No defined escalation signal detected | Routine human review | Check authenticity, scope, quality and fit before deciding |
| R201 | Exact duplicate of a submitted or published work by the same author | Proposed rejection | Confirm legitimate duplicate versus justified repost/revision; reject with feedback or clear |
| R301 | Text resembles a credential or private-key pattern | Further investigation | Check whether it is a real secret, verify authorization, redact if needed, and record clearance |
| R302 | `malware_samples`, `exploit_pocs`, `attack_simulations`, or `adversary_emulation` artifact | Further investigation | Verify scope/consent, risk and release requirements, then document clearance |

An investigation takes precedence over a proposed rejection; a proposed rejection takes precedence over routine review. The report stores all triggered rules and `LGN-TRIAGE-1` as the policy version.

## Authorization and decision rules

- **Bots do not publish, reject, ban or suspend.** They propose actions only; technical or controversial terminology is not itself grounds for rejection.
- Verified, active humans in private `reviewer`, `moderator`, or `admin` roles can request revision, reject with a reason, or approve.
- A flagged version cannot be published before an authorized human logs an investigation clearance and reason. Clearance alone **does not** publish.
- A reviewer cannot decide their own contribution. Review operations require the correct, current version to prevent acting on superseded material.
- Every human decision and clearance is recorded in `ghost_contribution_reviews`; author-visible review feedback is kept private from other members.

## Security and limitations

The bot is a synchronous PostgreSQL trigger, so no cron service, external API, human-run script or browser session is required. The rule records are in `ghost_contribution_triage`, protected by RLS and read-only to the member. The bot does **not** copy suspected credential values into the finding text or send submission content to a model vendor.

This is **not** a complete spam, harassment, impersonation, threat intelligence, malware-analysis or legal-compliance screening system. R001 does not prove work is safe. A human remains responsible for context, safety and editorial review, including disclosures that do not match the deterministic patterns. Reviewers must not execute submitted code or casually open unknown links.

The narrowly privileged `review_ghost_contribution` RPC is intentionally accessible to authenticated members but enforces server-owned membership roles, non-self-review, version and status checks. Supabase flags it for review: [Security-definer RPC advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). An independent production security review is required.

## Verification

- [13 bot screening/security checks](rules-bot-triage-acceptance.sql)
- [18 reviewer workflow checks](reviewer-workflow-rls-acceptance.sql)
- [14 author contribution privacy checks](contributions-rls-acceptance.sql)
- [9 handle reservation checks](handle-validation-rls-acceptance.sql)
- [5 URL and slash-validation tests](../../apps/web/tests/ghost-handle.test.ts)

All database tests create synthetic accounts inside a `BEGIN`/`ROLLBACK` transaction. No reviewer roles are automatically granted to real members.

## Next scope, not yet implemented

Before launch, add abuse reporting, appeals, review sampling, attachment scanning, spam/rate limits, safe external-link checks, human moderation dashboards and evidence retention rules. Optional AI-assisted interpretation would be **advisory** and requires a separately approved model, privacy controls, documented quality benchmarks, and an explicit human override; no model should be able to publish or reject independently by default.
