import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import type { WebsiteContent, WebsitePage } from "../shared/website.js";
import type { WebsiteCanvasGesture } from "./useWebsiteLayoutControls";
import "../styles/website-photo-framing.css";

type Box = { top: number; left: number; width: number; height: number };
type FramingView = { box: Box; viewport: Box; x: number; y: number; canPan: boolean; dragging: boolean };
type Session = { section: string; field: string; image: HTMLImageElement; x: number; y: number; update: (x: number, y: number) => void; measure: () => void; finish: (commit: boolean) => void; matchesDraft: () => boolean; stopDrag: () => void };
type Options = {
    page: WebsitePage; editing: boolean; canvasScale: number;
    latestContentRef: MutableRefObject<WebsiteContent>; setContent: Dispatch<SetStateAction<WebsiteContent>>;
    gestureRef: MutableRefObject<WebsiteCanvasGesture | null>; beforeStart: () => void;
    sectionElement: (id: string | null) => HTMLElement | undefined; send: (message: Record<string, unknown>) => void;
};
const focal = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
function photoSnapshot(content: WebsiteContent, page: WebsitePage, sectionId: string, field: string) {
    const section = content.pages[page]?.find(item => item.id === sectionId);
    const style = section?.fieldStyles?.[field] || {};
    return JSON.stringify([sectionId.startsWith("custom-") ? !!section : true, section?.fields[field] ?? null, Object.entries(style).sort(([a], [b]) => a.localeCompare(b))]);
}
function visibleViewport(): Box {
    const fallback = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    try {
        const frame = window.frameElement;
        if (!frame) return fallback;
        const parentWindow = frame.ownerDocument.defaultView;
        if (!parentWindow) return fallback;
        const rect = frame.getBoundingClientRect();
        if (!rect.width || !rect.height) return { ...fallback, width: 0, height: 0 };
        const scaleX = rect.width / window.innerWidth, scaleY = rect.height / window.innerHeight;
        let left = Math.max(0, rect.left), right = Math.min(parentWindow.innerWidth, rect.right);
        let top = Math.max(0, rect.top), bottom = Math.min(parentWindow.innerHeight, rect.bottom);
        for (let ancestor = frame.parentElement; ancestor; ancestor = ancestor.parentElement) {
            const style = parentWindow.getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
            const sx = ancestor.offsetWidth ? bounds.width / ancestor.offsetWidth : 1, sy = ancestor.offsetHeight ? bounds.height / ancestor.offsetHeight : 1;
            if (/(hidden|clip|scroll|auto)/.test(style.overflowX)) {
                const contentLeft = bounds.left + ancestor.clientLeft * sx;
                left = Math.max(left, contentLeft); right = Math.min(right, contentLeft + ancestor.clientWidth * sx);
            }
            if (/(hidden|clip|scroll|auto)/.test(style.overflowY)) {
                const contentTop = bounds.top + ancestor.clientTop * sy;
                top = Math.max(top, contentTop); bottom = Math.min(bottom, contentTop + ancestor.clientHeight * sy);
            }
        }
        return { top: (top - rect.top) / scaleY, left: (left - rect.left) / scaleX, width: Math.max(0, right - left) / scaleX, height: Math.max(0, bottom - top) / scaleY };
    } catch { return fallback; }
}
function positionValue(token: string | undefined): number {
    if (token === "left" || token === "top") return 0;
    if (token === "right" || token === "bottom") return 100;
    return token?.endsWith("%") ? focal(parseFloat(token)) : 50;
}
function imageGeometry(image: HTMLImageElement) {
    const computed = getComputedStyle(image);
    const width = image.clientWidth, height = image.clientHeight;
    const fit = computed.objectFit;
    let ratio = fit === "contain" || fit === "scale-down" ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
        : fit === "cover" ? Math.max(width / image.naturalWidth, height / image.naturalHeight) : 1;
    if (fit === "scale-down") ratio = Math.min(1, ratio);
    // object-position has no visible effect on a stretched image.
    const freeX = fit === "fill" ? 0 : width - image.naturalWidth * ratio;
    const freeY = fit === "fill" ? 0 : height - image.naturalHeight * ratio;
    const rect = image.getBoundingClientRect();
    let left = rect.left, right = rect.right, top = rect.top, bottom = rect.bottom;
    for (let parent = image.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
        if (/(hidden|clip|scroll|auto)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
        if (/(hidden|clip|scroll|auto)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
    }
    return { freeX, freeY, box: { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) } };
}

/** Temporary DOM positioning stays local until Done/flush. React owns the saved result. */
export function useWebsitePhotoFraming({ page, editing, canvasScale, latestContentRef, setContent, gestureRef, beforeStart, sectionElement, send }: Options) {
    const [view, setView] = useState<FramingView | null>(null);
    const sessionRef = useRef<Session | null>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [toolbarHeight, setToolbarHeight] = useState(98);
    const imageFor = useCallback((section: string, field: string) => Array.from(sectionElement(section)?.querySelectorAll<HTMLImageElement>("img[data-website-field]") || []).find(image => image.dataset.websiteField === field && image.complete && image.naturalWidth > 0), [sectionElement]);
    const canFrame = useCallback((section: string, field: string) => !!imageFor(section, field), [imageFor]);
    const finishSelection = useCallback((section: string, field?: string | null) => {
        const session = sessionRef.current;
        if (session && (session.section !== section || (field !== undefined && session.field !== field))) session.finish(true);
    }, []);
    const reconcileDraft = useCallback(() => {
        const session = sessionRef.current;
        if (session && !session.matchesDraft()) session.finish(false);
    }, []);
    const begin = useCallback((section: string, field: string) => {
        if (!editing || (sessionRef.current?.section === section && sessionRef.current.field === field)) return;
        gestureRef.current?.finish(true); beforeStart();
        const image = imageFor(section, field);
        if (!image) return;
        const originalStyle = image.getAttribute("style");
        const originalMarker = image.getAttribute("data-website-framing");
        const originalFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const snapshot = photoSnapshot(latestContentRef.current, page, section, field);
        const matchesDraft = () => photoSnapshot(latestContentRef.current, page, section, field) === snapshot;
        const style = latestContentRef.current.pages[page]?.find(item => item.id === section)?.fieldStyles?.[field];
        const position = getComputedStyle(image).objectPosition.split(/\s+/);
        const initialX = style?.focalX ?? (style?.focalY !== undefined ? 50 : positionValue(position[0]));
        const initialY = style?.focalY ?? (style?.focalX !== undefined ? 50 : positionValue(position[1]));
        image.setAttribute("data-website-framing", "true");
        const measure = () => {
            const session = sessionRef.current;
            if (!session || session.image !== image) return;
            const geometry = imageGeometry(image);
            setView(previous => ({ box: geometry.box, viewport: visibleViewport(), x: session.x, y: session.y, canPan: Math.abs(geometry.freeX) > 1 || Math.abs(geometry.freeY) > 1, dragging: previous?.dragging || false }));
        };
        const update = (x: number, y: number) => {
            const session = sessionRef.current;
            if (!session || session.image !== image) return;
            session.x = focal(x); session.y = focal(y);
            image.style.objectPosition = `${session.x}% ${session.y}%`;
            measure();
        };
        const finish = (commit: boolean) => {
            const session = sessionRef.current;
            if (!session || session.image !== image) return;
            session.stopDrag(); observer.disconnect();
            window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); window.removeEventListener("keydown", keydown, true);
            parentWindow?.removeEventListener("scroll", measure, true); parentWindow?.removeEventListener("resize", measure);
            if (originalStyle === null) image.removeAttribute("style"); else image.setAttribute("style", originalStyle);
            if (originalMarker === null) image.removeAttribute("data-website-framing"); else image.setAttribute("data-website-framing", originalMarker);
            sessionRef.current = null;
            if (gestureRef.current?.finish === finish) gestureRef.current = null;
            setView(null);
            let next = latestContentRef.current;
            if (commit && matchesDraft() && (session.x !== initialX || session.y !== initialY)) {
                const existing = next.pages[page] || [];
                const current = existing.find(item => item.id === section) || { id: section, fields: {} };
                const photoStyle = { ...current.fieldStyles?.[field], focalX: session.x, focalY: session.y };
                delete photoStyle.position;
                const updated = { ...current, fieldStyles: { ...current.fieldStyles, [field]: photoStyle } };
                next = { pages: { ...next.pages, [page]: existing.some(item => item.id === section) ? existing.map(item => item.id === section ? updated : item) : [...existing, updated] } };
                latestContentRef.current = next;
                send({ type: "website-photo-frame", section, field, focalX: session.x, focalY: session.y });
            }
            setContent(next);
            if (originalFocus?.isConnected) originalFocus.focus({ preventScroll: true });
        };
        const keydown = (event: KeyboardEvent) => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(false); }
        };
        const observer = new ResizeObserver(measure); observer.observe(image);
        let parentWindow: Window | null = null;
        try {
            const frame = window.frameElement;
            if (frame) {
                parentWindow = frame.ownerDocument.defaultView;
                if (parentWindow !== window) {
                    parentWindow?.addEventListener("scroll", measure, true); parentWindow?.addEventListener("resize", measure);
                    for (let ancestor = frame.parentElement; ancestor; ancestor = ancestor.parentElement) observer.observe(ancestor);
                }
            }
        } catch { /* Cross-origin or standalone previews use their own viewport. */ }
        sessionRef.current = { section, field, image, x: initialX, y: initialY, update, measure, finish, matchesDraft, stopDrag: () => {} };
        gestureRef.current = { finish };
        window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure); window.addEventListener("keydown", keydown, true);
        measure();
        requestAnimationFrame(() => surfaceRef.current?.focus({ preventScroll: true }));
    }, [beforeStart, editing, gestureRef, imageFor, latestContentRef, page, send, setContent]);
    const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        const session = sessionRef.current;
        if (!session || event.button !== 0) return;
        event.preventDefault(); event.stopPropagation(); session.stopDrag();
        const target = event.currentTarget, pointerId = event.pointerId;
        const startX = event.clientX, startY = event.clientY, x = session.x, y = session.y;
        const { freeX, freeY } = imageGeometry(session.image);
        target.focus({ preventScroll: true }); target.setPointerCapture(pointerId);
        setView(current => current ? { ...current, dragging: true } : current);
        const move = (pointer: PointerEvent) => {
            if (pointer.pointerId !== pointerId) return;
            pointer.preventDefault();
            // Pointer coordinates inside an iframe already use its unscaled CSS pixels.
            session.update(x + (Math.abs(freeX) > 1 ? (pointer.clientX - startX) / freeX * 100 : 0), y + (Math.abs(freeY) > 1 ? (pointer.clientY - startY) / freeY * 100 : 0));
        };
        const stop = () => {
            window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", up, true); window.removeEventListener("pointercancel", up, true);
            if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
            setView(current => current ? { ...current, dragging: false } : current);
            session.stopDrag = () => {};
        };
        const up = (pointer: PointerEvent) => { if (pointer.pointerId === pointerId) stop(); };
        session.stopDrag = stop;
        window.addEventListener("pointermove", move, { capture: true, passive: false }); window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", up, true);
    };
    const visible = !!view && view.viewport.width > 0 && view.viewport.height > 0;
    useEffect(() => {
        if (!view || !toolbarRef.current) return;
        const toolbar = toolbarRef.current;
        const measure = () => setToolbarHeight(toolbar.offsetHeight);
        const observer = new ResizeObserver(measure); observer.observe(toolbar); measure();
        return () => observer.disconnect();
    }, [visible, canvasScale]);
    useEffect(() => () => sessionRef.current?.finish(false), []);
    const scale = 1 / canvasScale;
    const viewport = view?.viewport || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const width = Math.max(0, Math.min(420, viewport.width * canvasScale - 20));
    const height = Math.max(0, Math.min(toolbarHeight, viewport.height * canvasScale - 20));
    const toolbarTop = view && view.box.top > viewport.top + (height + 20) * scale ? view.box.top - (height + 10) * scale : view ? view.box.top + view.box.height + 10 * scale : 0;
    const overlays = visible && view && <div className="website-photo-framing" data-website-overlay="true">
        <div className="website-photo-framing-backdrop" onPointerDown={() => surfaceRef.current?.focus({ preventScroll: true })} />
        <div ref={surfaceRef} className={`website-photo-framing-surface${view.dragging ? " is-dragging" : ""}`} style={view.box} tabIndex={0} role="group" aria-label="Reposition photograph. Drag or use arrow keys; Shift moves further. Enter to finish, Escape to cancel."
            onPointerDown={startDrag} onKeyDown={event => {
                const session = sessionRef.current;
                if (!session || event.metaKey || event.ctrlKey || event.altKey) return;
                if (event.key === "Enter") { event.preventDefault(); session.finish(true); return; }
                if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
                event.preventDefault(); event.stopPropagation();
                const step = event.shiftKey ? 5 : 1;
                session.update(session.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0), session.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0));
            }}>
            <span className="website-photo-framing-grid" aria-hidden="true" />
        </div>
        <div ref={toolbarRef} className="website-photo-framing-toolbar" role="group" aria-label="Photo framing controls" style={{ width, maxHeight: Math.max(0, viewport.height * canvasScale - 20), left: Math.max(viewport.left + 10 * scale, Math.min(view.box.left, viewport.left + viewport.width - (width + 10) * scale)), top: Math.max(viewport.top + 10 * scale, Math.min(toolbarTop, viewport.top + viewport.height - (height + 10) * scale)), transform: `scale(${scale})` }}>
            <div className="website-photo-framing-heading"><strong>Reposition photo</strong><span aria-live="polite">{Math.round(view.x)}% across · {Math.round(view.y)}% down</span></div>
            <p>{view.canPan ? "Drag the photo to frame it. Arrow keys fine-tune." : "The whole photo fits. Choose Fill or another shape to crop."}</p>
            <div className="website-photo-framing-actions"><button type="button" onClick={() => sessionRef.current?.update(50, 50)}>Center photo</button><span /><button type="button" onClick={() => sessionRef.current?.finish(false)}>Cancel</button><button type="button" className="website-photo-framing-done" onClick={() => sessionRef.current?.finish(true)}>Done</button></div>
        </div>
    </div>;
    return { active: !!view, overlays, begin, canFrame, finishSelection, reconcileDraft };
}
