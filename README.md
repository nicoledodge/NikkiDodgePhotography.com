# Nikki Dodge Photography

Marketing site for Nikki Dodge Photography, built with React, TypeScript, and Vite.

## Local development

- Use the pinned Node version from `.nvmrc`.
- Install dependencies with `npm install`.
- Start the dev server with `npm run dev`.
- Build the production bundle with `npm run build`.

## Deployment

- GitHub Actions builds and pushes a container image, then deploys to Kubernetes with [`scripts/deploy-k8s.sh`](/Users/rtm/Developer/NikkiDodgePhotography.com/scripts/deploy-k8s.sh).
- The workflow entry point is [`deploy.yml`](/Users/rtm/Developer/NikkiDodgePhotography.com/.github/workflows/deploy.yml).
- For local cluster inspection or manual rollout verification, use `KUBECONFIG=~/.kube/local.yaml kubectl ...`.
- To serve portfolio images from object storage or a CDN, set the GitHub Actions repository variable `PORTFOLIO_IMAGE_BASE_URL` to the full public `Portfolio` path, for example `https://images.nikkidodgephotography.com/Portfolio`.

## Content direction

- This site is meant to generate qualified leads for a real photography business.
- Keep copy specific to Nikki Dodge Photography, Colorado, and the actual services offered.
- Remove template leftovers instead of working around them.

## Portfolio image hosting

- The app now reads portfolio assets from `VITE_PORTFOLIO_IMAGE_BASE_URL` and falls back to local bundled assets when that variable is unset.
- The Docker build forwards `VITE_PORTFOLIO_IMAGE_BASE_URL` from the `PORTFOLIO_IMAGE_BASE_URL` repository variable in GitHub Actions.
- Use [`scripts/sync-portfolio-images.sh`](/Users/rtm/Developer/NikkiDodgePhotography.com/scripts/sync-portfolio-images.sh) to push `public/assets/images/Portfolio` to S3 once the correct AWS profile and bucket exist.
- Suggested flow:
  - `aws sso login --profile miles-production`
  - `export PORTFOLIO_BUCKET=<bucket-name>`
  - `scripts/sync-portfolio-images.sh`
