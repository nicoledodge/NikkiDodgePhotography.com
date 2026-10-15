import { useId } from "react";
import type { WebsiteField, WebsiteFieldStyle } from "../shared/website.js";
import "../styles/website-field-design.css";

type Props = { field: WebsiteField; value: WebsiteFieldStyle; onChange: (next: WebsiteFieldStyle) => void };
const colors = [
    { value: "#242923", name: "Ink" }, { value: "#62665e", name: "Stone" },
    { value: "#6b4d63", name: "Plum" }, { value: "#6b705c", name: "Olive" },
    { value: "#f6f4ef", name: "Ivory" }, { value: "#ffffff", name: "White" },
];
const positions = ["left", "top", "center", "bottom", "right"] as const;
const positionNames = { left: "Left", top: "Top", center: "Center", bottom: "Bottom", right: "Right" };
function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
    const start = align === "center" ? 7 : align === "right" ? 10 : 4;
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d={`M4 5h16M${start} 10h10M4 15h16M${start} 20h10`} /></svg>;
}
function FocusIcon({ position }: { position: NonNullable<WebsiteFieldStyle["position"]> }) {
    return <svg viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="3" y="3" width="22" height="18" rx="2" opacity=".45" /><circle cx={position === "left" ? 8 : position === "right" ? 20 : 14} cy={position === "top" ? 7 : position === "bottom" ? 17 : 12} r="2.6" fill="currentColor" stroke="none" /></svg>;
}
export default function WebsiteFieldDesign({ field, value, onChange }: Props) {
    const id = useId();
    if (field.id === "alt" || field.id.endsWith(".alt")) {
        return <section className="website-field-design field-design-metadata" aria-label="Photo description appearance">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="14" rx="3" /><path d="m8 17-3 4v-4M7 8h10M7 12h6" /></svg>
            <h4>A more accessible photograph</h4>
            <p>This description helps people using screen readers understand the photograph.</p>
            <p>Select the photograph on your page to adjust its shape, crop, and focus.</p>
        </section>;
    }
    const set = <K extends keyof WebsiteFieldStyle>(key: K, next: WebsiteFieldStyle[K]) => {
        const updated = { ...value };
        if (next === undefined) delete updated[key]; else updated[key] = next;
        onChange(updated);
    };
    const original = (key: keyof WebsiteFieldStyle) => <button type="button" className="field-design-inherit" disabled={value[key] === undefined} onClick={() => set(key, undefined)} title={`Use the original ${key}`}>{value[key] === undefined ? "Original" : "Reset"}</button>;
    const customized = Object.keys(value).some(key => value[key as keyof WebsiteFieldStyle] !== undefined);
    return <section className="website-field-design" aria-label={`${field.label} appearance`}>
        {field.kind === "text" ? <>
            <fieldset className="field-design-group">
                <legend>Text size</legend>{original("size")}
                <div className="field-design-size-options">{(["small", "medium", "large", "display"] as const).map(size => <button type="button" key={size} aria-label={`${size[0].toUpperCase()}${size.slice(1)} text size`} aria-pressed={value.size === size} onClick={() => set("size", size)}><span className={`field-design-type-sample is-${size}`} aria-hidden="true">Aa</span><span>{size[0].toUpperCase()}{size.slice(1)}</span></button>)}</div>
                <p className="field-design-note">Text scales with the screen.</p>
            </fieldset>
            <fieldset className="field-design-group">
                <legend>Alignment</legend>{original("align")}
                <div className="field-design-segments">{(["left", "center", "right"] as const).map(align => <button type="button" key={align} aria-label={`Align text ${align}`} aria-pressed={value.align === align} onClick={() => set("align", align)}><AlignIcon align={align} /><span>{align[0].toUpperCase()}{align.slice(1)}</span></button>)}</div>
            </fieldset>
            <fieldset className="field-design-group">
                <legend>Weight</legend>{original("weight")}
                <div className="field-design-segments field-design-weight">{(["normal", "bold"] as const).map(weight => <button type="button" key={weight} aria-pressed={value.weight === weight} onClick={() => set("weight", weight)}><span style={{ fontWeight: weight === "bold" ? 700 : 400 }}>{weight === "bold" ? "Bold" : "Regular"}</span></button>)}</div>
            </fieldset>
            <fieldset className="field-design-group">
                <legend>Text color</legend>{original("color")}
                <div className="field-design-colors">{colors.map(color => <button type="button" key={color.value} className="field-design-color" title={color.name} aria-label={`${color.name} text`} aria-pressed={value.color?.toLowerCase() === color.value} style={{ backgroundColor: color.value }} onClick={() => set("color", color.value)}>{value.color?.toLowerCase() === color.value && <svg viewBox="0 0 20 20" fill="none" stroke={color.value.startsWith("#f") ? "#6b4d63" : "#fff"} strokeWidth="1.8" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg>}</button>)}<label className="field-design-custom-color" title="Choose a custom text color"><input type="color" aria-label="Custom text color" value={value.color || "#242923"} onChange={event => set("color", event.target.value)} /><span aria-hidden="true">+</span></label></div>
                {value.color && <output className="field-design-color-value">{value.color.toUpperCase()}</output>}
            </fieldset>
        </> : <>
            <fieldset className="field-design-group">
                <legend>Photo shape</legend>{original("ratio")}
                <div className="field-design-ratios">{(["square", "portrait", "landscape"] as const).map(ratio => <button type="button" key={ratio} aria-label={`${ratio[0].toUpperCase()}${ratio.slice(1)} photo shape`} aria-pressed={value.ratio === ratio} onClick={() => set("ratio", ratio)}><span className="field-design-ratio-preview"><span className={`is-${ratio}`} /></span><span>{ratio[0].toUpperCase()}{ratio.slice(1)}</span></button>)}</div>
            </fieldset>
            <fieldset className="field-design-group">
                <legend>Fit inside the frame</legend>{original("fit")}
                <div className="field-design-segments field-design-fit">
                    <button type="button" aria-pressed={value.fit === "cover"} aria-describedby={`${id}-fit-note`} onClick={() => set("fit", "cover")}><span className="field-design-fit-example is-cover" aria-hidden="true"><i /></span><span>Fill frame</span></button>
                    <button type="button" aria-pressed={value.fit === "contain"} aria-describedby={`${id}-fit-note`} onClick={() => set("fit", "contain")}><span className="field-design-fit-example is-contain" aria-hidden="true"><i /></span><span>Show all</span></button>
                </div>
                <p className="field-design-note" id={`${id}-fit-note`}>{value.fit === "contain" ? "Keeps the whole photograph visible inside the frame." : value.fit === "cover" ? "Fills the frame. The edges may be cropped." : "Keeps the page’s original photo fit."}</p>
            </fieldset>
            <fieldset className="field-design-group">
                <legend>Keep in focus</legend>{original("position")}
                <div className="field-design-position">{positions.map(position => <button type="button" key={position} aria-label={`Focus photo ${position}`} aria-pressed={value.position === position} onClick={() => set("position", position)}><FocusIcon position={position} /><span>{positionNames[position]}</span></button>)}</div>
                <p className="field-design-note">Choose which part stays in view when the photo is cropped.</p>
            </fieldset>
        </>}
        <button type="button" className="field-design-reset" disabled={!customized} onClick={() => onChange({})}>Reset {field.kind === "text" ? "text" : "photo"} appearance</button>
    </section>;
}
