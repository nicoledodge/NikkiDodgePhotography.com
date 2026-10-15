import type { CSSProperties } from "react";
import type { WebsiteField, WebsiteFieldStyle } from "../shared/website.js";

const textSizes: Record<NonNullable<WebsiteFieldStyle["size"]>, string> = {
    small: "clamp(0.875rem, 0.85rem + 0.2vw, 1rem)",
    medium: "clamp(1rem, 0.93rem + 0.45vw, 1.25rem)",
    large: "clamp(1.5rem, 1.05rem + 1.8vw, 2.75rem)",
    display: "clamp(2.25rem, 1.1rem + 4.8vw, 5.75rem)",
};
const photoRatios: Record<NonNullable<WebsiteFieldStyle["ratio"]>, string> = {
    square: "1 / 1",
    portrait: "3 / 4",
    landscape: "3 / 2",
};

/** Only these bounded presentation choices reach the page; unset choices inherit its design. */
export function websiteFieldStyle(style?: WebsiteFieldStyle, kind: WebsiteField["kind"] = "text"): CSSProperties {
    if (!style) return {};
    const result: CSSProperties = {};
    if (kind === "image") {
        if (style.fit) result.objectFit = style.fit;
        if (style.position) result.objectPosition = style.position;
        if (style.ratio) {
            result.aspectRatio = photoRatios[style.ratio];
            result.width = "100%";
            result.height = "auto";
        }
    } else {
        if (style.size) result.fontSize = textSizes[style.size];
        if (style.color) result.color = style.color;
        if (style.align) result.textAlign = style.align;
        if (style.weight) result.fontWeight = style.weight === "bold" ? 700 : 400;
    }
    return result;
}
