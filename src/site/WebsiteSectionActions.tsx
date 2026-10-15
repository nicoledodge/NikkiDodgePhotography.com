import { Fragment, useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { observeWebsiteCanvasViewport, websiteCanvasViewport } from "./websiteCanvasViewport";
import "../styles/website-section-actions.css";

export type WebsiteSectionAction = "edit" | "add-before" | "add-after" | "rename" | "duplicate" | "copy" | "up" | "down" | "hide" | "remove";
type Props = { name: string; hidden: boolean; portable: boolean; first: boolean; last: boolean; canAdd: boolean; onAction: (action: WebsiteSectionAction) => void; scale?: number };
type Item = { action: WebsiteSectionAction; label: string; disabled?: boolean; divider?: boolean; danger?: boolean };

export default function WebsiteSectionActions({ name, hidden, portable, first, last, canAdd, onAction, scale = 1 }: Props) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState({ left: 0, top: 0, width: 238, maxHeight: 500 });
    const triggerRef = useRef<HTMLButtonElement>(null), menuRef = useRef<HTMLDivElement>(null);
    const initialFocus = useRef<"first" | "last">("first");
    const close = useCallback((restore = true) => { setOpen(false); if (restore) triggerRef.current?.focus({ preventScroll: true }); }, []);
    const items: Item[] = [
        { action: "edit", label: "Edit section content" },
        { action: "rename", label: "Rename section" },
        { action: "add-before", label: "Add section above", disabled: !canAdd, divider: true },
        { action: "add-after", label: "Add section below", disabled: !canAdd },
        ...(portable ? [{ action: "duplicate" as const, label: "Duplicate section", disabled: !canAdd }, { action: "copy" as const, label: "Copy to another page…" }] : []),
        { action: "up", label: "Move section up", disabled: first, divider: true },
        { action: "down", label: "Move section down", disabled: last },
        { action: "hide", label: hidden ? "Show section" : "Hide section", divider: true },
        ...(portable ? [{ action: "remove" as const, label: "Remove section", danger: true }] : []),
    ];
    useLayoutEffect(() => {
        if (!open || !menuRef.current || !triggerRef.current) return;
        const menu = menuRef.current, trigger = triggerRef.current;
        const measure = () => {
            const viewport = websiteCanvasViewport(), rect = trigger.getBoundingClientRect();
            const width = Math.max(0, Math.min(238, viewport.width / scale - 16));
            const maxHeight = Math.max(0, viewport.height / scale - 16);
            const height = Math.min(menu.scrollHeight, maxHeight) * scale;
            const top = rect.bottom + (menu.scrollHeight + 15) * scale <= viewport.top + viewport.height ? rect.bottom + 7 * scale : rect.top - height - 7 * scale;
            setPlacement({ width, maxHeight, left: Math.max(viewport.left + 8 * scale, Math.min(rect.right - width * scale, viewport.left + viewport.width - (width + 8) * scale)), top: Math.max(viewport.top + 8 * scale, Math.min(top, viewport.top + viewport.height - height - 8 * scale)) });
        };
        const enabled = () => Array.from(menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        measure(); const options = enabled(); (initialFocus.current === "last" ? options[options.length - 1] : options[0])?.focus({ preventScroll: true });
        const observer = new ResizeObserver(measure); observer.observe(menu); observer.observe(trigger);
        const stopObserving = observeWebsiteCanvasViewport(measure);
        const outside = (event: Event) => { const target = event.target; if (target instanceof Node && !menu.contains(target) && !trigger.contains(target)) close(false); };
        document.addEventListener("pointerdown", outside, true); document.addEventListener("focusin", outside, true);
        return () => { observer.disconnect(); stopObserving(); document.removeEventListener("pointerdown", outside, true); document.removeEventListener("focusin", outside, true); };
    }, [open, scale, close]);
    return <>
        <button ref={triggerRef} type="button" className="website-section-action-trigger" aria-label={`Section actions for ${name}`} title="Section actions" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
            onClick={event => { event.stopPropagation(); if (open) close(); else { initialFocus.current = "first"; setOpen(true); } }}
            onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); initialFocus.current = event.key === "ArrowUp" ? "last" : "first"; setOpen(true); } }}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
        </button>
        {open && createPortal(<div ref={menuRef} id={id} role="menu" aria-label={`Actions for ${name}`} className="website-section-action-menu" data-website-overlay="true" style={{ ...placement, transform: `scale(${scale})` }}
            onClick={event => event.stopPropagation()} onKeyDown={event => {
                event.stopPropagation();
                const menu = menuRef.current;
                if (!menu) return;
                const options = Array.from(menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
                const current = options.indexOf(document.activeElement as HTMLButtonElement);
                if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                    event.preventDefault();
                    const index = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                    options[index]?.focus();
                } else if (event.key === "Escape") { event.preventDefault(); close(); }
                else if (event.key === "Tab") {
                    event.preventDefault();
                    const tabbable = Array.from(document.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),iframe,[tabindex]')).filter(element => element.tabIndex >= 0 && element.getClientRects().length && !element.closest("[inert]") && !menu.contains(element));
                    const index = tabbable.indexOf(triggerRef.current!);
                    close(false); (tabbable[index + (event.shiftKey ? -1 : 1)] || triggerRef.current)?.focus();
                }
            }}>
            <div className="website-section-action-title" role="presentation">{name}</div>
            {items.map(item => <Fragment key={item.action}>{item.divider && <div role="separator" className="website-section-action-divider" />}<button type="button" role="menuitem" tabIndex={-1} disabled={item.disabled} className={item.danger ? "is-danger" : undefined} onClick={() => { close(); onAction(item.action); }}>{item.label}{item.disabled && !canAdd && ["add-before", "add-after", "duplicate"].includes(item.action) && <small>40 section limit</small>}</button></Fragment>)}
        </div>, document.body)}
    </>;
}
