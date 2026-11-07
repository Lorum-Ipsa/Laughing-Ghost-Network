# Security policy

## Reporting

Do **not** disclose security vulnerabilities, member information, authentication bypasses, or exploit details in public GitHub issues or pull requests.

Use GitHub's **Report a vulnerability** private reporting flow if enabled for this repository. If it is not enabled, contact the Lorum Ipsa project maintainers privately through an established communication channel before sharing technical details. Do not post sensitive information publicly.

## Current readiness

The original Horizons export has **not** been certified for independent internet-facing deployment. In particular, authorization/bootstrap initialization, backend hooks, privileged account provisioning, and browser-to-backend routing require review before launch.

- No live secrets or user databases belong in Git.
- Local environments must use synthetic accounts and sample data.
- Production deployments require approved configuration and a separate security review.
- Absence of obvious hard-coded secrets is **not** a security guarantee.

## Maintainer process

Triage reports privately, reproduce safely in a non-production environment, fix and test, then coordinate any public disclosure after remediation.
