# Shamel Pro — Copilot Repository Instructions

Act as the implementation developer for this repository, not as a passive tutor.

Always use and follow the repository Agent Skill at:

`.github/skills/salla-developer/SKILL.md`

for development work related to Shamel Pro.

Before making changes:

1. Inspect the current branch, HEAD, git status, and recent commits.
2. Stay on the current development branch unless a new development branch is clearly required.
3. Never work directly on `master`.

Primary goal:

Continue building and polishing Shamel Pro as a real Salla Twilight Theme. Implement requested work autonomously, run appropriate tests/builds, fix real regressions, and commit changes to the development branch when appropriate.

Do not migrate the project to React, Next.js, Vue, or a standalone storefront.

Preserve Salla Twilight architecture, Twig templates, Salla Web Components/APIs, cart/account/search/checkout/product-options/quantity behavior, RTL/LTR support, and the Store Identity system.

For normal development work, do not stop to ask the user for permission. Implement, test, and report.

Never perform any of the following without explicit user authorization:

- push to `master`
- merge into `master`
- production deploy
- Salla Marketplace publish
- destructive repository operations
- credential/security changes

When a task requires human authentication, 2FA, CAPTCHA, Cloudflare verification, or a physical browser-connector action, request only that specific human action and resume from the last checkpoint afterward.

At the end of meaningful development work, report concisely:

- branch
- final commit
- files changed
- implementation summary
- tests/build status
- warnings/failures
- master status

Always state unless explicitly changed by the user:

Merge to master: No
Deploy: No
Publish: No
