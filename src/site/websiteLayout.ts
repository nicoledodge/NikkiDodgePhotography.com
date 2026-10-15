import type { CSSProperties } from "react";
import type { WebsiteLayoutSettings } from "../shared/website.js";

export const websiteColumnClasses = new Set(["website-custom-split", "home-about-grid", "home-experience", "story-hero", "inner-about-hero", "inner-wedding", "inner-intro-split", "website-layout-grid"]);
export function isWebsiteColumnGrid(className: string): boolean {
    return className.split(/\s+/).some(name => websiteColumnClasses.has(name));
}
export function websiteLayoutProps(settings?: WebsiteLayoutSettings): { style?: CSSProperties; [key: string]: unknown } {
    if (!settings) return {};
    const style: CSSProperties & Record<string, string | number> = {};
    const attrs: Record<string, string> = {};
    if (settings.paddingTop !== undefined) { style["--website-padding-top"] = `${settings.paddingTop}px`; attrs["data-website-padding-top"] = "true"; }
    if (settings.paddingBottom !== undefined) { style["--website-padding-bottom"] = `${settings.paddingBottom}px`; attrs["data-website-padding-bottom"] = "true"; }
    if (settings.columnSplit !== undefined) {
        style["--website-column-first"] = `${settings.columnSplit}fr`;
        style["--website-column-second"] = `${100 - settings.columnSplit}fr`;
        attrs["data-website-column-split"] = "true";
    }
    if (settings.gap !== undefined) { style["--website-column-gap"] = `${settings.gap}px`; attrs["data-website-column-gap"] = "true"; }
    return { ...attrs, style };
}
