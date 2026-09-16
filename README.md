# Nikki Dodge Photography

Marketing site for Nikki Dodge Photography, built with React, TypeScript, and Vite.

## Booking platform rollout

The booking platform adds PostgreSQL, Better Auth social sign-in, Stripe payments, SMTP notifications, and private contract storage. Authentication and booking activation are separate gates, both disabled by default. This release replaces admin authentication, so production deployment is blocked until social authentication and a verified social admin are ready. The currently deployed version remains in service until that gate passes.

Use [the deployment and recovery runbook](deploy/booking/README.md) for the staged rollout, OAuth callbacks, admin bootstrap, migration Job, private S3 configuration, backup/restore, and acceptance checks. [`.env.example`](.env.example) contains names and safe defaults only. Do not commit runtime environment files or put secrets in `VITE_` variables.

After building the server, the operator commands are:

```sh
node scripts/migrate-booking.mjs
node scripts/check-booking-env.mjs --mode auth
node scripts/bootstrap-booking-admin.mjs --provider google --subject <verified-provider-account-id>
node scripts/check-booking-env.mjs --mode booking --database
```

The optional [PostgreSQL manifest](deploy/booking/postgres.yaml) is not applied automatically. Production activation requires functioning OAuth providers, database and backups, signed Stripe webhook verification, delivered test emails, private document access checks, verified social admin access, and owner-approved contract text.

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

## Admin media uploads

- The `/admin` media tab requests short-lived signed upload URLs from the Node API, then uploads files directly to S3 from the browser.
- Configure `CRM_S3_BUCKET` or `APP_S3_BUCKET`, plus `CRM_S3_REGION` or `AWS_REGION`, in the Kubernetes secret used by the app.
- Uploaded files are scoped under `CRM_S3_MEDIA_PREFIX`, which defaults to `site-assets`. Set `CRM_S3_MEDIA_PREFIX` to an empty string when the admin media manager should browse and organize the bucket root.
- Set `CRM_PUBLIC_ASSET_BASE_URL` when the bucket is served through a CDN or custom public image domain.
- `CRM_MAX_DIRECT_UPLOAD_BYTES` controls the signed browser upload limit and defaults to 200 MB.
- The bucket CORS policy must allow authenticated admin browsers to `PUT` objects, for example:

```json
[
  {
    "AllowedOrigins": [
      "https://nikkidodgephotography.com",
      "https://www.nikkidodgephotography.com"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
