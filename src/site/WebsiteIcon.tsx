import type { CSSProperties } from "react";
export type IconName = "undo" | "redo" | "desktop" | "phone" | "eye" | "hide" | "plus" | "up" | "down" | "grip" | "close" | "arrow" | "check" | "pages" | "layers" | "photo" | "text" | "split" | "invitation" | "external" | "settings" | "history";
const paths: Record<IconName, React.ReactNode> = {
    undo: <><path d="m9 5-5 5 5 5" /><path d="M4 10h10a6 6 0 0 1 0 12" /></>,
    redo: <><path d="m15 5 5 5-5 5" /><path d="M20 10H10a6 6 0 0 0 0 12" /></>,
    desktop: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    hide: <><path d="m3 3 18 18M10 5a12 12 0 0 1 12 7s-1 2-3 4M6 6c-3 2-4 6-4 6s3 7 10 7a12 12 0 0 0 5-1" /></>,
    plus: <path d="M12 5v14M5 12h14" />, up: <path d="m6 14 6-6 6 6" />, down: <path d="m6 10 6 6 6-6" />,
    grip: <><path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" strokeWidth="3" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />, arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />, pages: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    layers: <><path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5" /></>,
    photo: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-7 5 8" /></>,
    text: <><path d="M4 5h16M12 5v16M8 21h8M4 5v3M20 5v3" /></>,
    split: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M11 3v18M14 8h4M14 12h4M14 16h3" /></>,
    invitation: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    external: <><path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
    settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
};
export default function WebsiteIcon({ name, style }: { name: IconName; style?: CSSProperties }) {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
