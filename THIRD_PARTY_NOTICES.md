# Third-party notices

FunnelFlux Open UI bundles third-party packages under their respective licenses. The exact production dependency inventory is generated from the frozen `pnpm-lock.yaml` during each release:

```bash
pnpm install --frozen-lockfile
pnpm licenses list --prod --json > THIRD_PARTY_NOTICES.json
```

The release workflow attaches that machine-readable inventory to the matching GitHub Release. Package copyright and license files remain available in their published package contents. This notice does not replace or modify any third-party license.
