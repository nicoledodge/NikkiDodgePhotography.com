#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = path.join(root, "output/curated-assets/Portfolio");
const manifestPath = path.join(root, "src/data/curatedPortfolio.json");
const widths = [640, 960, 1920];
const categories = new Set([
  "Engagements", "Family", "Graduations", "Homes", "Headshots",
  "Lifestyles", "Music", "Representatives", "Sports", "Weddings",
]);
const profile = process.env.AWS_PROFILE || "miles-production";
const bucket = process.env.PORTFOLIO_BUCKET || "nikkidodgephotography-images-891377212071";

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a nonempty string.`);
  }
  return value.trim();
}

function validate(input) {
  if (!input || !Array.isArray(input.stories) || !input.stories.length) {
    throw new Error("Input must contain a nonempty stories array.");
  }
  const seenNames = new Set();
  return input.stories.map((story, storyIndex) => {
    const label = `Story ${storyIndex + 1}`;
    if (!story || !categories.has(story.category)) {
      throw new Error(`${label} must use an existing photography category: ${[...categories].join(", ")}.`);
    }
    const name = requireText(story.name, `${label} name`);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) {
      throw new Error(`${label} name must start with a letter or number and contain only letters, numbers, hyphens, or underscores.`);
    }
    if (seenNames.has(name.toLowerCase())) {
      throw new Error(`${label} has a duplicate story name: ${name}.`);
    }
    seenNames.add(name.toLowerCase());
    if (!Array.isArray(story.photos) || !story.photos.length) {
      throw new Error(`${label} must contain at least one photo.`);
    }
    if (!Number.isInteger(story.cover) || story.cover < 0 || story.cover >= story.photos.length) {
      throw new Error(`${label} cover must be a zero-based index into its photos.`);
    }
    return {
      category: story.category,
      name,
      title: requireText(story.title, `${label} title`),
      description: requireText(story.description, `${label} description`),
      cover: story.cover,
      photos: story.photos.map((photo, photoIndex) => {
        const photoLabel = `${label}, photo ${photoIndex + 1}`;
        requireText(photo?.sourceKey, `${photoLabel} sourceKey`);
        const sourceKey = photo.sourceKey;
        if (/^s3:\/\//i.test(sourceKey) || sourceKey.startsWith("/") || /[\u0000-\u001f\u007f]/.test(sourceKey)) {
          throw new Error(`${photoLabel} sourceKey must be an exact bucket-relative S3 object key.`);
        }
        return {
          sourceKey,
          alt: requireText(photo.alt, `${photoLabel} alt`),
          ...(photo.localPath === undefined ? {} : {
            localPath: requireText(photo.localPath, `${photoLabel} localPath`),
          }),
        };
      }),
    };
  });
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] === "--help") {
    console.log("Usage: node scripts/prepare-portfolio.mjs /absolute/path/to/private-selection.json");
    console.log("Generates local WebP derivatives and a public manifest. Never uploads or changes S3 objects.");
    if (process.argv[2] !== "--help") process.exitCode = 1;
    return;
  }
  if (!/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/.test(bucket)) {
    throw new Error("PORTFOLIO_BUCKET must be a bucket name, without an S3 URL or prefix.");
  }
  const inputPath = path.resolve(process.argv[2]);
  const stories = validate(JSON.parse(await readFile(inputPath, "utf8")));
  const staging = await mkdtemp(path.join(tmpdir(), "nikki-curated-"));
  const manifestTemporary = `${manifestPath}.${process.pid}.tmp`;
  let totalPhotos = 0;
  let totalBytes = 0;
  try {
    const publishedStories = [];
    for (const story of stories) {
      const storyDir = path.join(outputRoot, story.category, story.name);
      await mkdir(storyDir, { recursive: true });
      const photos = [];
      for (const photo of story.photos) {
        let sourcePath;
        if (photo.localPath) {
          sourcePath = path.resolve(path.dirname(inputPath), photo.localPath);
        } else {
          sourcePath = path.join(staging, `source-${totalPhotos}`);
          await run("aws", [
            "s3", "cp", `s3://${bucket}/${photo.sourceKey}`, sourcePath,
            "--profile", profile, "--no-progress", "--only-show-errors",
          ], { maxBuffer: 1024 * 1024 });
        }
        const original = await readFile(sourcePath);
        const hash = createHash("sha256").update(original).digest("hex").slice(0, 12);
        const variants = new Map();
        let largest;
        for (const width of widths) {
          const file = `web-${hash}-${width}.webp`;
          // sharp strips source metadata by default; rotate applies EXIF orientation first.
          const { data, info } = await sharp(original)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer({ resolveWithObject: true });
          await writeFile(path.join(storyDir, file), data);
          totalBytes += data.length;
          largest = { file, width: info.width, height: info.height };
          // Small originals can produce equal widths; srcset must have unique descriptors.
          variants.set(info.width, { file, width: info.width });
        }
        photos.push({ ...largest, alt: photo.alt, variants: [...variants.values()] });
        totalPhotos += 1;
      }
      const { category, name, title, description, cover } = story;
      publishedStories.push({ category, name, title, description, cover, photos });
      console.log(`Prepared ${category}/${name}: ${photos.length} photographs.`);
    }
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestTemporary, `${JSON.stringify({ stories: publishedStories }, null, 2)}\n`);
    await rename(manifestTemporary, manifestPath);
    console.log(`Prepared ${totalPhotos} photographs across ${stories.length} stories (${(totalBytes / 1024 / 1024).toFixed(1)} MB of WebP files).`);
    console.log(`Derivatives: ${outputRoot}`);
    console.log(`Public manifest: ${manifestPath}`);
    console.log("Review the generated images before publishing. No files were uploaded.");
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(manifestTemporary, { force: true });
  }
}

main().catch((error) => {
  console.error(`Portfolio preparation failed: ${error.message}`);
  process.exitCode = 1;
});
