#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-public/assets/images/Portfolio}"
AWS_PROFILE_NAME="${AWS_PROFILE:-miles-production}"
AWS_REGION_NAME="${AWS_REGION:-us-east-1}"
PORTFOLIO_BUCKET_NAME="${PORTFOLIO_BUCKET:-}"
PORTFOLIO_PREFIX_PATH="${PORTFOLIO_PREFIX:-Portfolio}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"

if [[ -z "$PORTFOLIO_BUCKET_NAME" ]]; then
  echo "PORTFOLIO_BUCKET is required" >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

destination="s3://${PORTFOLIO_BUCKET_NAME}/${PORTFOLIO_PREFIX_PATH#/}"

aws s3 sync \
  "$SOURCE_DIR" \
  "$destination" \
  --profile "$AWS_PROFILE_NAME" \
  --region "$AWS_REGION_NAME" \
  --delete \
  --exclude ".DS_Store" \
  --cache-control "public,max-age=31536000,immutable"

if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
  aws cloudfront create-invalidation \
    --profile "$AWS_PROFILE_NAME" \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/${PORTFOLIO_PREFIX_PATH#/}/*"
fi
