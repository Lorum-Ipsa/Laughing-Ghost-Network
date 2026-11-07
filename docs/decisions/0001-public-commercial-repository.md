# ADR 0001 — public repository for a commercial LGN product

Status: Proposed, pending maintainer review.

LGN is a commercial-intent Lorum Ipsa product. A public repository improves discoverability, transparency, and collaboration but does not itself establish an open-source license. Sensitive production data, credentials and infrastructure details must remain outside the repository.

**Decision:** use a public source repository with maintainer-controlled merges. Do not add an open-source license or merge substantive third-party contributions until appropriate IP and contributor terms are selected.

**Trade-offs:** easier community review and recruitment; public source/history can also disclose implementation details. Security must rely on correct controls, not obscurity.
