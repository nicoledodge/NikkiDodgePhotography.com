import previews from "../data/portfolioPreviews.json";
import dimensions from "../data/photoDimensions.json";
import { curatedStories, storyPhotoUrl } from "../data/curatedPortfolio";

const curatedPhotos = new Map(curatedStories.flatMap((story) =>
  story.photos.map((photo) => [portfolioAssetKey(storyPhotoUrl(story, photo)), photo] as const),
));

const siblingUrl = (original: string, file: string) => original.slice(0, original.lastIndexOf("/") + 1) + file;

export function portfolioAssetKey(original: string): string {
  // Metadata keys are independent of the configured portfolio storage host.
  return original.includes("/assets/images/Portfolio/")
    ? original.slice(original.indexOf("/assets/images/Portfolio/"))
    : `/assets/images/Portfolio/${original.split("/").slice(-3).join("/")}`;
}

export function portfolioPreview(original: string): string {
  const photo = curatedPhotos.get(portfolioAssetKey(original));
  if (photo) return siblingUrl(original, photo.variants.find((variant) => variant.width >= 960)?.file || photo.file);
  return (
    (previews as Record<string, string>)[portfolioAssetKey(original)] ||
    original
  );
}

export function portfolioSrcSet(original: string): string | undefined {
  return curatedPhotos.get(portfolioAssetKey(original))?.variants
    .map((variant) => `${siblingUrl(original, variant.file)} ${variant.width}w`).join(", ");
}

export function portfolioDimensions(original: string): number[] | undefined {
  const photo = curatedPhotos.get(portfolioAssetKey(original));
  return photo ? [photo.width, photo.height] : (dimensions as Record<string, number[]>)[portfolioAssetKey(original)];
}

export function portfolioAlt(original: string): string | undefined {
  return curatedPhotos.get(portfolioAssetKey(original))?.alt;
}
