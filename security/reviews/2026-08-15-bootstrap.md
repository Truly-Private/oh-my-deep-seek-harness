# Bootstrap security review

Review state: `reviewed`

Primary upstream commit: `47f943859bef60e4160492346772ded9b24f765a`

Inspiration commit: `de9e880c19cdd37166caf3912fbbb794ed388c32`

## Completed evidence

| Check | Result |
| --- | --- |
| Upstream lock validation | Passed for the primary commit and candidate policy. |
| Validator unit tests | Seven tests passed across provenance and audit parsing. |
| Supply-chain lock policy | The 1,201-entry regenerated lockfile passed the repository policy. |
| Production dependency audit | Initial upstream result was 1 low, 12 moderate, and 12 high; patched-version overrides reduced the result to zero known findings. |
| Documentation links | 1,901 Markdown files passed relative-link and fragment validation. |
| Translation pairing | 940 English/Chinese pairs passed consistency validation. |
| Agent Note validation | 542 notes passed classification and format checks. |
| License and notices | 222 distribution packages declare MIT and `THIRD_PARTY_NOTICES.md` is current. |
| Security workflow | [Run 31934015026](https://github.com/Truly-Private/oh-my-deepseek-harness/actions/runs/31934015026) passed provenance, dependency review, production dependency audit, full-history Gitleaks, JavaScript/TypeScript CodeQL, and Python CodeQL on downstream commit `81639eec6c8083809bf47e41ad836269ab71bbf3`, which contains the pinned primary upstream commit. |
| Host bridge integration | TypeScript typecheck and 27 conformance tests, eight Hermes Python tests, the real Pi loader snapshot, and the real OMP RPC loader passed locally on 2026-08-20. |

## Approval

The maintainer approved primary upstream commit `47f943859bef60e4160492346772ded9b24f765a` for release on 2026-08-20 after the commit-matched security workflow and integration evidence passed.

[`security/upstream-lock.json`](../upstream-lock.json) records the matching reviewed commit, timestamp, evidence identifiers, and release policy.
