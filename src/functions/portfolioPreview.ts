import previews from "../data/portfolioPreviews.json";

export function portfolioAssetKey(original: string): string {
  // Metadata keys are independent of the configured portfolio storage host.
  return original.includes("/assets/images/Portfolio/")
    ? original.slice(original.indexOf("/assets/images/Portfolio/"))
    : `/assets/images/Portfolio/${original.split("/").slice(-3).join("/")}`;
}

export function portfolioPreview(original: string): string {
  return (
    (previews as Record<string, string>)[portfolioAssetKey(original)] ||
    original
  );
}
