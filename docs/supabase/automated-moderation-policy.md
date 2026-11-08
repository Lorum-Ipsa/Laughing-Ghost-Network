# LGN contribution publication and screening

A verified, active Ghost can publish research from Ghost Space. The Publish contribution action requires a title and at least one of a summary, description, code, or source link. The database screens the exact version in the same transaction. Ordinary submissions become public immediately, with a timestamp and version history.

Malware analysis, sample source code, exploit proofs of concept, attack simulations, and adversary emulation are eligible for research publication. The category and cybersecurity terminology alone do not trigger a hold. The current policy also removes the duplicate-only hold.

## Specific concern that triggers review

| Rule | Trigger | Outcome |
| --- | --- | --- |
| R301 | A supported credential or private-key pattern appears in the submission | Keep the version private and ask a reviewer to check for exposed secrets and request redaction if needed |

LGN displays the type of concern without copying the matched text into the finding. A reviewer can request changes, reject with a reason, or record a clearance and then publish. A reviewer cannot decide their own held work. Clearance applies to one exact version. A corrected submission without a finding publishes on resubmission.

Existing queued contributions retain their historical findings. Authors can withdraw and resubmit them under the new policy. Previously recorded findings remain available as audit history.

## Handling published code

LGN renders source as escaped text inside the public article. Copy and plain-text downloads are available. LGN does not run submitted code, interpret it as HTML, or host executable attachments through this workflow. External citations remain separate links.

## Development verification

Apply [the version guard](review-version-guard.sql) followed by [the publication SQL](publish-research-with-targeted-screening.sql) after approval for persistent rollout. To verify in a rollback-only transaction, place both SQL files immediately after `begin;` in a temporary copy of each acceptance script.

- [Publication and targeted screening](targeted-publication-acceptance.sql)
- [Reviewer authorization and decisions](reviewer-workflow-rls-acceptance.sql)
- [Contribution authorization and privacy](contributions-rls-acceptance.sql)
- [Historical v1 screening checks](rules-bot-triage-acceptance.sql), run before applying the new publication SQL.

Browser acceptance should cover publishing an ordinary contribution and an inert code sample, opening both as a signed-out visitor, and confirming that a synthetic credential marker stays private until corrected or cleared. The published-code check should confirm that markup-like text is visible literally and creates no DOM elements or script execution.

The initial screen detects a limited set of credential patterns. Post-publication reporting and takedown are separate work.
