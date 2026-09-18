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

## Reviewed S3 portfolio curation

Keep a private selection JSON outside the repository. Only include photographs reviewed for public portfolio use; an archive upload does not automatically publish a gallery. Each story uses an existing photography category, a unique path-safe `name` (letters, numbers, hyphens, underscores), public `title` and `description`, a zero-based `cover` index, and `photos` with an exact bucket-relative `sourceKey` and descriptive `alt` text. A photo may also provide `localPath` (absolute or relative to the selection JSON) to use an already downloaded original.

```json
{
  "stories": [{
    "category": "Weddings",
    "name": "reviewed-story",
    "title": "Public gallery title",
    "description": "A reviewed description of this session.",
    "cover": 0,
    "photos": [{
      "sourceKey": "private/archive/exact-object.jpg",
      "alt": "A specific description of the selected photograph."
    }]
  }]
}
```

Generate locally with the pinned Node version and installed dependencies:

```sh
AWS_PROFILE=miles-production node scripts/prepare-portfolio.mjs /absolute/path/to/private-selection.json
```

The command only reads selected S3 objects and writes local output. `PORTFOLIO_BUCKET` defaults to `nikkidodgephotography-images-891377212071`; `AWS_PROFILE` defaults to `miles-production`. It rotates images correctly, strips metadata, and creates 640-, 960-, and 1920-pixel WebP variants (quality 82, without enlarging smaller originals). Content-hashed files land in `output/curated-assets/Portfolio/{category}/{name}/`; the public `src/data/curatedPortfolio.json` contains filenames, actual dimensions, alt text, and story copy, never private source keys. The selection JSON is the complete curated collection, so keep existing reviewed stories in it when adding more.

Review the derivatives before separately publishing them under the matching public `Portfolio/` prefix, then deploy the manifest and verify live images. Regeneration is deterministic and leaves existing derivatives in place. Do not pass the curated output to `sync-portfolio-images.sh`: that older helper uses `--delete` and could remove other published portfolio images. Never commit the private selection, downloaded originals, or local `output/` artifacts.

For local development with published curated galleries, use `VITE_PORTFOLIO_IMAGE_BASE_URL=https://images.nikkidodgephotography.com/Portfolio npm run dev`. Their web copies live in S3 and are not committed as repository binaries.

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
