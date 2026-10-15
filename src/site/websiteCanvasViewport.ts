export type WebsiteCanvasViewport = { top: number; left: number; width: number; height: number };

/** The iframe can be wider than its visible scrolling container at 100% zoom. */
export function websiteCanvasViewport(): WebsiteCanvasViewport {
    const fallback = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    try {
        const frame = window.frameElement, parentWindow = frame?.ownerDocument.defaultView;
        if (!frame || !parentWindow) return fallback;
        const rect = frame.getBoundingClientRect();
        if (!rect.width || !rect.height) return { ...fallback, width: 0, height: 0 };
        const scaleX = rect.width / window.innerWidth, scaleY = rect.height / window.innerHeight;
        let left = Math.max(0, rect.left), right = Math.min(parentWindow.innerWidth, rect.right);
        let top = Math.max(0, rect.top), bottom = Math.min(parentWindow.innerHeight, rect.bottom);
        for (let ancestor = frame.parentElement; ancestor; ancestor = ancestor.parentElement) {
            const style = parentWindow.getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
            const sx = ancestor.offsetWidth ? bounds.width / ancestor.offsetWidth : 1, sy = ancestor.offsetHeight ? bounds.height / ancestor.offsetHeight : 1;
            if (/(hidden|clip|scroll|auto)/.test(style.overflowX)) {
                const start = bounds.left + ancestor.clientLeft * sx;
                left = Math.max(left, start); right = Math.min(right, start + ancestor.clientWidth * sx);
            }
            if (/(hidden|clip|scroll|auto)/.test(style.overflowY)) {
                const start = bounds.top + ancestor.clientTop * sy;
                top = Math.max(top, start); bottom = Math.min(bottom, start + ancestor.clientHeight * sy);
            }
        }
        return { top: (top - rect.top) / scaleY, left: (left - rect.left) / scaleX, width: Math.max(0, right - left) / scaleX, height: Math.max(0, bottom - top) / scaleY };
    } catch { return fallback; }
}

export function observeWebsiteCanvasViewport(measure: () => void): () => void {
    window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    let parentWindow: Window | null = null;
    try {
        const frame = window.frameElement;
        if (frame) {
            parentWindow = frame.ownerDocument.defaultView;
            parentWindow?.addEventListener("scroll", measure, true); parentWindow?.addEventListener("resize", measure);
            for (let ancestor = frame.parentElement; ancestor; ancestor = ancestor.parentElement) observer.observe(ancestor);
        }
    } catch { /* Standalone and cross-origin callers use their own viewport. */ }
    return () => {
        window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure);
        parentWindow?.removeEventListener("scroll", measure, true); parentWindow?.removeEventListener("resize", measure); observer.disconnect();
    };
}
