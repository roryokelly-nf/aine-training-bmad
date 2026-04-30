# Deployment

The repo deploys to Cloudflare Pages on every push to `main` via `.github/workflows/deploy.yml`.

## Required GitHub repository secrets

| Secret | Where to get it |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token. Use the "Edit Cloudflare Workers" template (or a custom token with `Account.Cloudflare Pages: Edit` permissions). |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers & Pages → Account ID (right sidebar). |

## One-time Cloudflare setup

1. Create a Pages project in the Cloudflare dashboard. Name it whatever you like (e.g., `bmad-checklist`).
2. Open `.github/workflows/deploy.yml` and replace `<project-name>` in the final `command:` line with that project name.
3. Push to `main`; the workflow will deploy and report the live URL.

Until the secrets and project name are in place, the deploy workflow will run and fail (CI is unaffected).
