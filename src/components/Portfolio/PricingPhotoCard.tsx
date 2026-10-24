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
    const [card, setCard] = useState({ index: 0, flipped: false, faces: [photos[0], photos[1] || photos[0]] });
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

    async function flip() {
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
                flipped: !previous.flipped,
                faces: previous.flipped ? [nextPhoto, previous.faces[1]] : [previous.faces[0], nextPhoto],
            }));
            release.current = setTimeout(() => { if (active.current) setBusy(false); }, 650);
        } catch {
            if (active.current) setBusy(false);
        }
    }

    return (
        <button type="button" className={`pricing-photo-card ${className}`} onClick={flip}
            aria-label={`Show next ${category.toLowerCase()} photo. Photo ${card.index + 1} of ${photos.length}.`}
            aria-disabled={busy || photos.length < 2} data-flipped={card.flipped}>
            <span className="pricing-photo-turn">
                {card.faces.map((photo, side) => (
                    <span className={`pricing-photo-face pricing-photo-face-${side}`} key={side} aria-hidden={side !== Number(card.flipped)}>
                        <img src={portfolioPreview(photo.src)} srcSet={portfolioSrcSet(photo.src)} sizes={sizes}
                            alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
                    </span>
                ))}
            </span>
            <span className="pricing-photo-hint" aria-hidden="true"><span>Flip for another ↻</span><span>{card.index + 1} / {photos.length}</span></span>
        </button>
    );
}
