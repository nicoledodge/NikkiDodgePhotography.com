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

## Website storage

Production uses the dedicated `default/nikki-website-data` 64 GiB Longhorn PVC. Its two replicas are restricted to verified NVMe devices on R610-A and R510-C by the `nikki-website-nvme` disk tag. The SFTP photo archive remains separate and is never mounted by the website.

- Storage, the public image ingress, and certificate renewal are defined in `infra/website-storage.yaml`.
- Set the GitHub repository variable `WEBSITE_DATA_PVC=nikki-website-data` to retain the `/app/data` mount on every production deployment. The deployment uses one writer and the Recreate strategy. Website compute prefers R510-C and avoids R610-A because its CNI sandbox setup was failing during migration; both NVMe storage replicas remain on their verified devices.
- CRM documents live in `/app/data/app-data`; public website photos and static assets live in `/app/data/media`. Only the media directory is served publicly.
- Leave `CRM_S3_BUCKET` and `APP_S3_BUCKET` unset or empty. Set `CRM_LOCAL_STORAGE_ROOT=/app/data`, `CRM_S3_MEDIA_PREFIX` to an empty string, and `CRM_PUBLIC_ASSET_BASE_URL=https://images.nikkidodgephotography.com`.
- Keep `PORTFOLIO_IMAGE_BASE_URL=https://images.nikkidodgephotography.com/Portfolio`. That domain serves the website PVC through the local ingress.
- `scripts/sync-portfolio-images.sh` publishes local portfolio derivatives to the website PVC with SHA-256 verification and atomic replacement of each selected file. It retains unlisted website files and never writes to the SFTP masters.
- `/assets` serves the copied static website assets on the PVC, with the application image supplying generated JavaScript and CSS.

## Admin media uploads

The media manager browses only the dedicated website media directory. Browser uploads pass through the authenticated API and are stored on the website PVC. `CRM_MAX_SERVER_UPLOAD_BYTES` controls their maximum size; production uses 200 MiB with a 210 MiB ingress limit to allow multipart form overhead. CRM JSON writes use a synced temporary file and atomic rename.

Set `CRM_STORAGE_READ_ONLY=true` only during a storage cutover. API writes then return HTTP 503 with `Retry-After`; public reads remain available. Restore it to `false` after the final document snapshot has been verified.

Run `npm run build` and `node scripts/check-local-storage.mjs` to verify authentication, CRM persistence across a restart, media upload/move/delete, and the maintenance write hold against isolated temporary storage.

S3 deletion requires a completed archive content-verification report and a verified website/CRM cutover. A successful deploy alone does not authorize deleting the archive source or its historical versions.
