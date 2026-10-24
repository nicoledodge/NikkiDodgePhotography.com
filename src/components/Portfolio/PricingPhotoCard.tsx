import { useEffect, useRef, useState } from "react";
import { portfolioPreview, portfolioSrcSet } from "../../functions/portfolioPreview";

export interface PricingPhoto {
    src: string;
    alt: string;
    width: number;
    height: number;
}

export default function PricingPhotoCard({ photos, category, className = "", sizes }: {
    photos: PricingPhoto[];
    category: string;
    className?: string;
    sizes: string;
}) {
    const [card, setCard] = useState({ index: 0, activeFace: 0, faces: [photos[0], photos[1] || photos[0]] });
    const [busy, setBusy] = useState(false);
    const active = useRef(true);
    const release = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        active.current = true;
        return () => { active.current = false; clearTimeout(release.current); };
    }, []);

    useEffect(() => {
        const preload = new Image();
        preload.src = portfolioPreview(photos[(card.index + 1) % photos.length].src);
    }, [card.index, photos]);

    async function advance() {
        if (busy || photos.length < 2) return;
        setBusy(true);
        const nextIndex = (card.index + 1) % photos.length;
        const nextPhoto = photos[nextIndex];
        const preload = new Image();
        preload.src = portfolioPreview(nextPhoto.src);
        try {
            await preload.decode();
            if (!active.current) return;
            setCard(previous => ({
                index: nextIndex,
                activeFace: 1 - previous.activeFace,
                faces: previous.activeFace === 1 ? [nextPhoto, previous.faces[1]] : [previous.faces[0], nextPhoto],
            }));
            release.current = setTimeout(() => { if (active.current) setBusy(false); }, 400);
        } catch {
            if (active.current) setBusy(false);
        }
    }

    return (
        <button type="button" className={`pricing-photo-card ${className}`} onClick={advance}
            aria-label={`Show next ${category.toLowerCase()} photo. Photo ${card.index + 1} of ${photos.length}.`}
            aria-disabled={busy || photos.length < 2} data-active-face={card.activeFace}>
            <span className="pricing-photo-stage">
                {card.faces.map((photo, side) => (
                    <span className={`pricing-photo-face pricing-photo-face-${side}`} key={side} aria-hidden={side !== card.activeFace}>
                        <img src={portfolioPreview(photo.src)} srcSet={portfolioSrcSet(photo.src)} sizes={sizes}
                            alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
                    </span>
                ))}
            </span>
            <span className="pricing-photo-hint" aria-hidden="true"><span>Next session →</span><span>{card.index + 1} / {photos.length}</span></span>
        </button>
    );
}
