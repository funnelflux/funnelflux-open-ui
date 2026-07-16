# Public repository launch checklist

Complete this checklist before changing repository visibility. Keep sensitive scanner output outside the public repository.

- [ ] Inventory every retained local, remote-tracking, and tag ref with `git for-each-ref --format='%(refname) %(objectname)'`.
- [ ] Inventory tracked, ignored, large, and gitlink content with `git ls-files -co --exclude-standard`, `git count-objects -vH`, and `git ls-files --stage | awk '$1 == "160000"'`.
- [ ] Run an all-history scanner such as `gitleaks detect --log-opts='--all' --redact`; record its version and command externally.
- [ ] Review every scanner finding. Rotate exposed credentials before publication. History rewriting requires a separate approved operation.
- [ ] Decide explicitly whether tracked `.ai/**`, harness scripts, and wire-sample guidance are part of the public product. `.gitignore` does not hide already tracked files or history.
- [ ] Review every retained branch and tag, not only `develop` and `master`.
- [ ] Obtain legal approval for the ELv2 summary and the contribution mechanism (DCO or CLA), then configure its required check.
- [ ] Add a second CODEOWNER or maintained owner team.
- [ ] Configure branch and tag rulesets, least-privilege Actions, private vulnerability reporting, dependency/security alerts, secret scanning, push protection, and code scanning.
- [ ] Test unauthenticated clone, issue creation, fork creation, a fork PR into `develop`, rejection of a fork PR into `master`, and rejection of direct/force pushes.
- [ ] Test the protected release actor can create a new `v*` tag but cannot move or delete an existing tag.

Publication is blocked until every item has evidence and an owner approval.
