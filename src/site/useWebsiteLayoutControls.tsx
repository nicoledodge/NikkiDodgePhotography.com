import { useCallback, useEffect, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type SetStateAction, type MutableRefObject } from "react";
import { websitePages, type WebsiteContent, type WebsiteLayoutSettings, type WebsitePage } from "../shared/website.js";
import { websiteLayoutProps } from "./websiteLayout";

export interface WebsiteCanvasGesture { finish: (commit: boolean) => void }
type Setting = keyof WebsiteLayoutSettings;
type Bounds = { top: number; left: number; width: number; height: number };
type Measurements = { box: Bounds; top: number; bottom: number; grid?: { box: Bounds; split: number; gap: number; divider: number; rtl: boolean } };
type GestureView = { type: "layout"; setting: Setting; value: number } | { type: "reorder"; x: number; y: number; targetY: number; before: string | null };
type Options = {
    page: WebsitePage; editing: boolean; selectedId: string | null; canvasScale: number;
    content: WebsiteContent; latestContentRef: MutableRefObject<WebsiteContent>; setContent: Dispatch<SetStateAction<WebsiteContent>>;
    gestureRef: MutableRefObject<WebsiteCanvasGesture | null>; beforeStart: () => void;
    sectionElement: (id: string | null) => HTMLElement | undefined; send: (message: Record<string, unknown>) => void;
};
const limits: Record<Setting, [number, number, number]> = { paddingTop: [0, 240, 8], paddingBottom: [0, 240, 8], columnSplit: [25, 75, 1], gap: [0, 96, 8] };
const settingLabels: Record<Setting, string> = { paddingTop: "Top spacing", paddingBottom: "Bottom spacing", columnSplit: "Column balance", gap: "Column gap" };
function snap(value: number, setting: Setting): number { const [min, max, step] = limits[setting]; return Math.max(min, Math.min(max, Math.round(value / step) * step)); }
function bounds(rect: DOMRect): Bounds { return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }; }
function readMeasurements(element: HTMLElement): Measurements {
    const style = getComputedStyle(element);
    const result: Measurements = { box: bounds(element.getBoundingClientRect()), top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
    const grid = element.matches("[data-website-layout-grid]") ? element : element.querySelector<HTMLElement>("[data-website-layout-grid]");
    if (grid) {
        const gridStyle = getComputedStyle(grid);
        const columns = gridStyle.gridTemplateColumns.split(/\s+/).map(Number.parseFloat);
        if (gridStyle.display === "grid" && columns.length === 2 && columns.every(Number.isFinite)) {
            const box = bounds(grid.getBoundingClientRect());
            const gap = gridStyle.columnGap.endsWith("%") ? parseFloat(gridStyle.columnGap) * box.width / 100 : parseFloat(gridStyle.columnGap) || 0;
            const rtl = gridStyle.direction === "rtl";
            result.grid = { box, gap, rtl, split: columns[0] / (columns[0] + columns[1]) * 100, divider: rtl ? box.left + box.width - columns[0] - gap / 2 : box.left + columns[0] + gap / 2 };
        }
    }
    return result;
}
function applyTemporarySettings(element: HTMLElement, settings: WebsiteLayoutSettings) {
    const props = websiteLayoutProps(settings);
    for (const [key, value] of Object.entries(props)) {
        if (key === "style") { for (const [property, setting] of Object.entries(value as Record<string, string>)) element.style.setProperty(property, setting); }
        else element.setAttribute(key, String(value));
    }
}
export function useWebsiteLayoutControls({ page, editing, selectedId, canvasScale, content, latestContentRef, setContent, gestureRef, beforeStart, sectionElement, send }: Options) {
    const [measurements, setMeasurements] = useState<Measurements | null>(null);
    const [gesture, setGesture] = useState<GestureView | null>(null);
    const keyboardGesture = useRef<{ setting: Setting; update: (delta: number) => void } | null>(null);
    const read = useCallback(() => {
        const element = sectionElement(selectedId);
        setMeasurements(element ? readMeasurements(element) : null);
    }, [sectionElement, selectedId]);
    useEffect(() => {
        if (!editing) return;
        let frame = 0;
        const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read); };
        const element = sectionElement(selectedId);
        const observer = new ResizeObserver(measure);
        if (element) observer.observe(element);
        window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure); document.addEventListener("load", measure, true); measure();
        return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); document.removeEventListener("load", measure, true); };
    }, [editing, content, selectedId, read, sectionElement]);
    const beginLayout = useCallback((setting: Setting, pointer?: ReactPointerEvent<HTMLButtonElement>) => {
        const element = sectionElement(selectedId);
        if (!editing || !selectedId || !element) return;
        gestureRef.current?.finish(true); beforeStart();
        const initial = readMeasurements(element);
        if ((setting === "columnSplit" || setting === "gap") && !initial.grid) return;
        const initialValue = setting === "paddingTop" ? initial.top : setting === "paddingBottom" ? initial.bottom : setting === "gap" ? initial.grid!.gap : initial.grid!.split;
        let currentValue = initialValue;
        let changed = false;
        const startX = pointer?.clientX || 0, startY = pointer?.clientY || 0;
        const savedStyle = element.getAttribute("style");
        const attributeNames = ["data-website-padding-top", "data-website-padding-bottom", "data-website-column-split", "data-website-column-gap"];
        const savedAttributes = attributeNames.map(name => [name, element.getAttribute(name)] as const);
        const pointerTarget = pointer?.currentTarget;
        const pointerId = pointer?.pointerId;
        const gestureId = crypto.randomUUID();
        const originalSelection = document.body.style.userSelect;
        document.body.style.userSelect = "none";
        const update = (value: number) => {
            currentValue = snap(value, setting); changed = currentValue !== initialValue;
            applyTemporarySettings(element, { [setting]: currentValue });
            setGesture({ type: "layout", setting, value: currentValue }); read();
        };
        const move = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;
            event.preventDefault();
            // Iframe client coordinates are already unscaled layout pixels.
            const delta = setting === "paddingTop" || setting === "paddingBottom" ? event.clientY - startY : event.clientX - startX;
            if (setting === "columnSplit") update(initialValue + delta * (initial.grid!.rtl ? -1 : 1) / Math.max(1, initial.grid!.box.width - initial.grid!.gap) * 100);
            else update(initialValue + delta);
        };
        const finish = (commit: boolean) => {
            if (!gestureRef.current || gestureRef.current.finish !== finish) return;
            window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", up, true); window.removeEventListener("pointercancel", cancel, true); window.removeEventListener("keydown", escape, true);
            if (pointerId !== undefined && pointerTarget?.hasPointerCapture(pointerId)) pointerTarget.releasePointerCapture(pointerId);
            document.body.style.userSelect = originalSelection;
            if (savedStyle === null) element.removeAttribute("style"); else element.setAttribute("style", savedStyle);
            for (const [name, value] of savedAttributes) { if (value === null) element.removeAttribute(name); else element.setAttribute(name, value); }
            gestureRef.current = null; keyboardGesture.current = null; setGesture(null);
            let next = latestContentRef.current;
            if (commit && changed) {
                const existing = next.pages[page] || [];
                const settings = { [setting]: currentValue };
                const sections = existing.some(section => section.id === selectedId)
                    ? existing.map(section => section.id === selectedId ? { ...section, layoutSettings: { ...section.layoutSettings, ...settings } } : section)
                    : [...existing, { id: selectedId, fields: {}, layoutSettings: settings }];
                next = { pages: { ...next.pages, [page]: sections } };
                latestContentRef.current = next;
                send({ type: "website-layout-change", section: selectedId, settings, gestureId });
            }
            setContent(next); requestAnimationFrame(read);
        };
        const up = (event: PointerEvent) => { if (event.pointerId === pointerId) finish(true); };
        const cancel = () => finish(false);
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(false); } };
        gestureRef.current = { finish };
        setGesture({ type: "layout", setting, value: Math.round(initialValue) });
        window.addEventListener("keydown", escape, true);
        if (pointer) {
            pointer.preventDefault(); pointer.stopPropagation(); pointerTarget!.focus(); pointerTarget!.setPointerCapture(pointerId!);
            window.addEventListener("pointermove", move, { capture: true, passive: false }); window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", cancel, true);
        } else keyboardGesture.current = { setting, update: delta => update(currentValue + delta) };
    }, [beforeStart, editing, gestureRef, latestContentRef, page, read, sectionElement, selectedId, send, setContent]);
    const beginReorder = useCallback((pointer: ReactPointerEvent<HTMLButtonElement>) => {
        const element = sectionElement(selectedId);
        if (!editing || !selectedId || !element || pointer.button !== 0) return;
        gestureRef.current?.finish(true); beforeStart(); pointer.preventDefault(); pointer.stopPropagation();
        const target = pointer.currentTarget, pointerId = pointer.pointerId;
        target.focus(); target.setPointerCapture(pointerId);
        const startX = pointer.clientX, startY = pointer.clientY;
        let clientX = startX, clientY = startY, moved = false, before: string | null = null, frame = 0;
        const originalSelection = document.body.style.userSelect;
        const originalScroll = document.documentElement.style.scrollBehavior;
        document.body.style.userSelect = "none"; document.documentElement.style.scrollBehavior = "auto";
        element.setAttribute("data-website-reordering", "true");
        const locate = () => {
            const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-website-section]")).filter(item => item !== element);
            const candidates = elements.flatMap((item, index) => {
                const rect = item.getBoundingClientRect();
                return [{ y: rect.top, before: item.dataset.websiteSection! }, ...(index === elements.length - 1 ? [{ y: rect.bottom, before: null }] : [])];
            });
            const closest = candidates.reduce<{ y: number; before: string | null } | null>((best, item) => !best || Math.abs(item.y - clientY) < Math.abs(best.y - clientY) ? item : best, null);
            before = closest?.before ?? null;
            setGesture({ type: "reorder", x: clientX, y: clientY, targetY: closest?.y ?? clientY, before });
        };
        const tick = () => {
            if (!gestureRef.current || gestureRef.current.finish !== finish) return;
            const edge = 54 / canvasScale;
            if (moved && clientY < edge) window.scrollBy(0, -16 / canvasScale);
            else if (moved && clientY > window.innerHeight - edge) window.scrollBy(0, 16 / canvasScale);
            if (moved) locate();
            frame = requestAnimationFrame(tick);
        };
        const move = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;
            event.preventDefault(); clientX = event.clientX; clientY = event.clientY;
            moved ||= Math.hypot(clientX - startX, clientY - startY) > 4 / canvasScale;
            if (moved) locate();
        };
        const finish = (commit: boolean) => {
            if (!gestureRef.current || gestureRef.current.finish !== finish) return;
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", up, true); window.removeEventListener("pointercancel", cancel, true); window.removeEventListener("keydown", escape, true);
            if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
            element.removeAttribute("data-website-reordering"); document.body.style.userSelect = originalSelection; document.documentElement.style.scrollBehavior = originalScroll;
            gestureRef.current = null; setGesture(null);
            let next = latestContentRef.current;
            if (commit && moved) {
                const existing = next.pages[page] || [];
                const full = [...existing, ...websitePages[page].sections.map((_, index) => ({ id: `original-${index}`, fields: {} })).filter(section => !existing.some(item => item.id === section.id))];
                const moving = full.find(section => section.id === selectedId);
                if (moving) {
                    const reordered = full.filter(section => section.id !== selectedId);
                    const destination = before === null ? reordered.length : reordered.findIndex(section => section.id === before);
                    if (destination >= 0) reordered.splice(destination, 0, moving);
                    if (destination >= 0 && full.map(section => section.id).join() !== reordered.map(section => section.id).join()) {
                        next = { pages: { ...next.pages, [page]: reordered } }; latestContentRef.current = next;
                        send({ type: "website-reorder", section: selectedId, before });
                    }
                }
            }
            setContent(next); requestAnimationFrame(read);
        };
        const up = (event: PointerEvent) => { if (event.pointerId === pointerId) finish(true); };
        const cancel = () => finish(false);
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(false); } };
        gestureRef.current = { finish };
        window.addEventListener("pointermove", move, { capture: true, passive: false }); window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", cancel, true); window.addEventListener("keydown", escape, true);
        frame = requestAnimationFrame(tick);
    }, [beforeStart, canvasScale, editing, gestureRef, latestContentRef, page, read, sectionElement, selectedId, send, setContent]);
    const onLayoutKey = (setting: Setting, event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Escape") { event.preventDefault(); gestureRef.current?.finish(false); return; }
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        if (!keyboardGesture.current || keyboardGesture.current.setting !== setting) beginLayout(setting);
        const [, max, step] = limits[setting];
        const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        keyboardGesture.current?.update(event.key === "Home" ? -max : event.key === "End" ? max : direction * step * (event.shiftKey ? 2 : 1));
    };
    const scale = 1 / canvasScale;
    const currentValue = (setting: Setting, fallback: number) => gesture?.type === "layout" && gesture.setting === setting ? gesture.value : Math.round(fallback);
    const valueLabel = (setting: Setting, value: number) => setting === "columnSplit" ? `${value}% / ${100 - value}%` : `${value} px`;
    const handle = (setting: Setting, fallback: number, style: React.CSSProperties, className: string) => {
        const value = currentValue(setting, fallback);
        return <button type="button" role="slider" className={`website-layout-handle ${className}${gesture?.type === "layout" && gesture.setting === setting ? " is-dragging" : ""}`} style={style}
            aria-label={settingLabels[setting]} aria-orientation={setting === "paddingTop" || setting === "paddingBottom" ? "vertical" : "horizontal"}
            aria-valuemin={limits[setting][0]} aria-valuemax={Math.max(limits[setting][1], value)} aria-valuenow={value} aria-valuetext={valueLabel(setting, value)}
            title={`${settingLabels[setting]}: drag or use arrow keys. Escape cancels.`} onPointerDown={event => { if (event.button === 0) beginLayout(setting, event); }}
            onKeyDown={event => onLayoutKey(setting, event)} onKeyUp={event => { if (/^(Arrow|Home|End)/.test(event.key)) gestureRef.current?.finish(true); }} onBlur={() => { if (keyboardGesture.current) gestureRef.current?.finish(true); }}>
            <span className="website-layout-grip" aria-hidden="true">{setting === "columnSplit" || setting === "gap" ? "↔" : "↕"}</span><span>{settingLabels[setting]} <strong>{valueLabel(setting, value)}</strong></span>
        </button>;
    };
    const grid = measurements?.grid;
    const box = measurements?.box;
    const controlsVisible = editing && box && box.top + box.height > 0 && box.top < window.innerHeight;
    const sectionName = content.pages[page]?.find(section => section.id === selectedId)?.name || (selectedId?.startsWith("original-") ? websitePages[page].sections[Number(selectedId.slice(9))] : "Section") || "Section";
    const overlays = controlsVisible && <div className="website-layout-controls" data-website-overlay="true">
        {gesture?.type !== "reorder" && <>
            {box.top + measurements.top >= 0 && box.top + measurements.top < window.innerHeight && <>
                <div className={`website-layout-space-band${gesture?.type === "layout" && gesture.setting === "paddingTop" ? " is-active" : ""}`} style={{ top: box.top, left: box.left, width: box.width, height: measurements.top }} />
                {handle("paddingTop", measurements.top, { left: Math.max(10 * scale, box.left + box.width - 190 * scale), top: box.top + measurements.top, transform: `translateY(-50%) scale(${scale})` }, "website-layout-space-handle")}
            </>}
            {box.top + box.height > 0 && box.top + box.height < window.innerHeight && <>
                <div className={`website-layout-space-band${gesture?.type === "layout" && gesture.setting === "paddingBottom" ? " is-active" : ""}`} style={{ top: box.top + box.height - measurements.bottom, left: box.left, width: box.width, height: measurements.bottom }} />
                {handle("paddingBottom", measurements.bottom, { left: Math.max(10 * scale, box.left + box.width - 190 * scale), top: box.top + box.height, transform: `translateY(-50%) scale(${scale})` }, "website-layout-space-handle")}
            </>}
            {grid && grid.box.top + grid.box.height > 0 && grid.box.top < window.innerHeight && <>
                <div className={`website-layout-divider${gesture?.type === "layout" && gesture.setting === "columnSplit" ? " is-active" : ""}`} style={{ left: grid.divider, top: Math.max(0, grid.box.top), height: Math.min(window.innerHeight, grid.box.top + grid.box.height) - Math.max(0, grid.box.top) }} />
                {handle("columnSplit", grid.split, { left: grid.divider, top: Math.max(90 * scale, Math.min(window.innerHeight - 100 * scale, grid.box.top + grid.box.height / 2)), transform: `translate(-50%, -50%) scale(${scale})` }, "website-layout-column-handle")}
                {handle("gap", grid.gap, { left: grid.divider, top: Math.max(90 * scale, Math.min(window.innerHeight - 100 * scale, grid.box.top + grid.box.height / 2)) + 34 * scale, transform: `translate(-50%, -50%) scale(${scale})` }, "website-layout-gap-handle")}
            </>}
        </>}
        {gesture?.type === "reorder" && <>
            <div className="website-layout-drop-line" style={{ top: Math.max(3, Math.min(window.innerHeight - 3, gesture.targetY)), left: 8 * scale, right: 8 * scale }}><span style={{ transform: `scale(${scale})` }}>Move section here</span></div>
            <div className="website-layout-drag-ghost" style={{ left: Math.max(8 * scale, Math.min(window.innerWidth - 230 * scale, gesture.x + 14 * scale)), top: Math.max(8 * scale, Math.min(window.innerHeight - 45 * scale, gesture.y + 14 * scale)), transform: `scale(${scale})` }}>{sectionName}<small>Release to move · Esc to cancel</small></div>
        </>}
        <span className="website-layout-announcement" aria-live="polite">{gesture?.type === "layout" ? `${settingLabels[gesture.setting]} ${valueLabel(gesture.setting, gesture.value)}` : gesture?.type === "reorder" ? `Moving ${sectionName}` : ""}</span>
    </div>;
    return {
        overlays, active: !!gesture,
        layoutDefaults: measurements ? { paddingTop: Math.round(measurements.top), paddingBottom: Math.round(measurements.bottom), ...(grid ? { columnSplit: Math.round(grid.split), gap: Math.round(grid.gap) } : {}) } : undefined,
        gripProps: {
            onPointerDown: beginReorder,
            onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
                if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); beforeStart(); send({ type: "website-section-action", section: selectedId, action: event.key === "ArrowUp" ? "up" : "down" }); }
            },
        },
    };
}
