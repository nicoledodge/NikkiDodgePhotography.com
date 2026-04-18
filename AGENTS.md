# Repository Guidance

## Purpose

This repository powers the Nikki Dodge Photography website. Treat it as a lead-generation site for a real business, not a template demo.

## Content guardrails

- Remove contest, marketplace, user-profile, and template-placeholder language when you touch a page.
- Do not introduce fake awards, fake participation counts, fake deadlines, fake client IDs, or invented performance stats.
- Prefer clear calls to action that move a visitor toward inquiry: portfolio, pricing, and contact.
- Keep geography aligned to Colorado, Highlands Ranch, Denver, and real destination coverage only when the copy supports it.

## App structure

- Frontend: React + TypeScript + Vite.
- Main routes live under [`src/pages`](/Users/rtm/Developer/NikkiDodgePhotography.com/src/pages).
- Shared portfolio media definitions live under [`src/components/MediaLibrary`](/Users/rtm/Developer/NikkiDodgePhotography.com/src/components/MediaLibrary).
- Primary site styling lives in [`src/NikkiDodgePhotography.css`](/Users/rtm/Developer/NikkiDodgePhotography.com/src/NikkiDodgePhotography.css).

## Local workflow

- Use the Node version pinned in `.nvmrc`.
- Install dependencies with `npm install`.
- Start the local site with `npm run dev`.
- Verify production output with `npm run build`.

## Deployment

- GitHub Actions deployment is defined in [`deploy.yml`](/Users/rtm/Developer/NikkiDodgePhotography.com/.github/workflows/deploy.yml).
- Kubernetes manifests are applied by [`scripts/deploy-k8s.sh`](/Users/rtm/Developer/NikkiDodgePhotography.com/scripts/deploy-k8s.sh).
- For local cluster checks, use `KUBECONFIG=~/.kube/local.yaml kubectl ...`.
- If `kubectl` is missing from PATH on macOS, try `/usr/local/bin/kubectl`.

## Editing preference

- Reuse the real portfolio assets already in the repo.
- Favor deleting dead template code over leaving unreachable placeholder files around.
- When updating copy, optimize for trust, clarity, and booking intent.
