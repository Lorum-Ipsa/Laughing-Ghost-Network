# ADR 0002 — preserve PocketBase for the initial migration

Status: Proposed, pending maintainer review.

The Horizons export has PocketBase migrations, hooks and a React frontend that depends on a fixed PocketBase proxy path. Replacing this backend while extracting from Horizons would confound defects and increase the initial release risk.

**Decision:** first make the existing stack reproducible in local/staging environments, remediate privilege initialization, and audit access rules. Evaluate Supabase separately after functional parity is verified.

**Trade-offs:** preserves the existing investment and shortens parity testing; PocketBase operations, proxying and scaling remain explicit responsibilities.
