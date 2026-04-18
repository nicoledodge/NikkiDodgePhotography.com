import React from "react";

export function renderInlineEmphasis(text: string): React.ReactNode {
    const segments = text.split(/(\*[^*]+\*)/g).filter(Boolean);

    return segments.map((segment, index) => {
        if (segment.startsWith("*") && segment.endsWith("*")) {
            return <em key={`${segment}-${index}`}>{segment.slice(1, -1)}</em>;
        }

        return <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>;
    });
}
