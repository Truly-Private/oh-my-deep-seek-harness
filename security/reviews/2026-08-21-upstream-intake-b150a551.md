# Upstream intake security review for b150a551

Review state: `candidate`

Previously reviewed primary commit: `47f943859bef60e4160492346772ded9b24f765a`

Candidate primary commit: `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`

Inspiration commit: `de9e880c19cdd37166caf3912fbbb794ed388c32`

## Intake scope

The candidate advances the primary upstream by 854 commits and preserves both upstream and downstream ancestry in a merge commit. Conflict resolution retains downstream package scope, repository metadata, product branding, security policy, release tooling, and integration claims. Newly accepted upstream packages use the `@truly-private/omdsh-*` scope and downstream repository URL. The upstream browser brand-slot package renders the downstream logo and product name instead of restoring DeepSeek artwork.

The inspiration repository remains comparison material and is not the code merge base. This intake does not imply endorsement by DeepSeek AI, Yuan Chenglu, or either contributor community.

## Local evidence

The following exact-candidate evidence must be recorded before maintainer approval:

| Check | State |
| --- | --- |
| Upstream lock validation and validator tests | Pending on the completed merge commit. |
| Full-history Gitleaks scan | Pending on the completed merge commit. |
| Production dependency audit and lockfile policy | Pending after lockfile regeneration. |
| Targeted review of credentials, subprocesses, filesystem permissions, network parsing, and executable loading | Pending. |
| Repository static, build, documentation, package, and snapshot gates | Pending. |
| Downstream release-family verification and package installation smoke tests | Pending for version 0.0.3. |

## Remote evidence

GitHub provenance validation, production dependency audit, full-history Gitleaks, JavaScript/TypeScript CodeQL, Python CodeQL, and pull-request dependency review remain pending until the candidate branch is pushed and its workflow results are inspected.

## Release decision

The candidate is not reviewed, secure, vulnerability-free, or release-ready. `security/upstream-lock.json` remains in `candidate` state. A release labeled reviewed requires complete commit-matched evidence and explicit human maintainer approval.
