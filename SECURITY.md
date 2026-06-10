# Security Policy

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in FunnelFlux Open UI, report it
privately so it can be fixed before public disclosure:

- Use GitHub's **[Private vulnerability reporting](https://github.com/funnelflux/funnelflux-open-ui/security/advisories/new)**
  (Security → Report a vulnerability), or
- Email **support@funnelflux.com** with the details.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (proof-of-concept if possible).
- Affected version(s) / commit or tag.
- Any suggested remediation.

## What to Expect

- We aim to acknowledge reports within **5 business days**.
- We will keep you informed of progress toward a fix.
- We ask that you give us a reasonable window to release a fix before any public
  disclosure. We're happy to credit you in the release notes if you'd like.

## Scope

This UI is a front-end that talks to a FunnelFlux self-hosted backend. Issues
in the PHP backend, tracking engine, or database belong to the parent
FunnelFlux self-hosted project, not this repository. When in doubt, report it
here and we'll route it.

## Supported Versions

Security fixes are applied to the latest release on the default branch. Older
tagged releases are not maintained — please track the latest tag.
