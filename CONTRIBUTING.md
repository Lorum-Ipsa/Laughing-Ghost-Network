# Contributing to LGN

LGN is an Lorum Ipsa project being prepared for collaboration and eventual commercialization.

## Before contributing code

- Begin with a public issue for non-sensitive feature ideas, UX feedback, or bugs.
- **Do not submit sensitive vulnerability details or exploit demonstrations in public issues.** Follow [SECURITY.md](SECURITY.md).
- The repository does not yet have an open-source license or contributor IP agreement. **A public repository is not a grant of permission to copy, redistribute, or commercialize this source.**
- Contributors should not assume that opening a PR grants permission to merge or determines compensation, employment, ownership, or equity. The maintainer will define appropriate contribution terms before accepting substantive external code.

## Working agreement

- Keep PRs focused; do not perform broad rewrites or swap the backend without an approved design.
- Preserve existing LGN member privacy and pseudonymity.
- Never commit credentials, user databases, exports, logs containing PII, or live member data.
- Keep authorization checks on the server/database; client-side route guards alone are insufficient.
- Explain what was tested, what was not tested, and any migration or deployment impacts.
- Do not merge into `main` without maintainer approval.

See [AGENTS.md](AGENTS.md) and [development guidance](docs/development.md).
