import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import mediaLibrary from "../components/MediaLibrary/MediaLibrary";
import {
  portfolioDimensions,
  portfolioPreview,
  portfolioSrcSet,
  portfolioAlt,
} from "../functions/portfolioPreview";
import { formatSessionName } from "./Portfolio";
import "../styles/gallery-presentation.css";

export const GALLERY = "/gallery";
const categoryLabels: Record<string, string> = {
  Engagements: "Couples", Graduations: "Seniors & graduates", Lifestyles: "Lifestyle",
  Representatives: "Community", Homes: "Spaces", Music: "Live music",
};
function GalleryArrow({ previous = false }: { previous?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={previous ? "M20 12H4m6-6-6 6 6 6" : "M4 12h16m-6-6 6 6-6 6"} /></svg>;
}

export default function Gallery() {
  const { categoryName, sessionName } = useParams();
  const category = Object.values(mediaLibrary).find(
    (item) => item.category.toLowerCase() === categoryName?.toLowerCase(),
  );
  const session = category?.sessions.find((item) => item.name === sessionName);
  const [active, setActive] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const images = useMemo(() =>
    session?.mediaFiles
      .filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file))
      .map((file) => `${category!.path}/${session.name}/${file}`)
      .filter((src) => Boolean(portfolioDimensions(src))) || [], [category, session]);
  const title = session?.title || formatSessionName(sessionName || "");
  const categoryLabel = category ? categoryLabels[category.category] || category.category : "";
  const viewerOpen = active !== null && Boolean(images[active]);
  const availableStories = category?.sessions.filter((item) => item.featuredHorizontal) || [];
  const currentStory = availableStories.findIndex((item) => item.name === sessionName);
  const next = availableStories.length > 1
    ? availableStories[(currentStory + 1) % availableStories.length]
    : undefined;

  useEffect(() => {
    dialogRef.current?.close();
    openerRef.current = null;
    setActive(null);
    setVisibleCount(24);
  }, [categoryName, sessionName]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !viewerOpen) return;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActive((index) =>
          index === null ? null : (index + 1) % images.length,
        );
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActive((index) =>
          index === null ? null : (index - 1 + images.length) % images.length,
        );
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setActive(event.key === "Home" ? 0 : images.length - 1);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      if (dialog.open) dialog.close();
      if (openerRef.current?.isConnected) openerRef.current.focus({ preventScroll: true });
    };
  }, [viewerOpen, images.length]);
  const close = () => {
    dialogRef.current?.close();
    setActive(null);
  };

  if (!session || !category)
    return (
      <section className="site-container empty-state">
        <p className="eyebrow">A different direction</p>
        <h1>Let’s find your story.</h1>
        <p>This gallery isn’t available. There’s plenty more to explore.</p>
        <Link className="text-link" to="/Portfolio">
          Back to the portfolio ↗
        </Link>
      </section>
    );
  return (
    <div className="gallery-presentation">
      <section className="gallery-intro site-container" aria-labelledby="gallery-story-title">
        <Link className="gallery-back" to={`/Portfolio/${category.category}`}>
          <GalleryArrow previous />Back to {categoryLabel.toLowerCase()}
        </Link>
        <div className="gallery-story-heading">
          <div><p className="eyebrow">{categoryLabel} / A photo story</p><h1 id="gallery-story-title">{title}</h1></div>
          <div className="gallery-story-introduction">
            {session.description && <p className="gallery-description">{session.description}</p>}
            <Link className="text-link gallery-inquire" to={`/Contact?session=${category.category}`}>
              Plan a session with Nikki <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="gallery-story-meta"><span>{images.length} {images.length === 1 ? "photograph" : "photographs"}</span><span>Open a photograph to see it in full</span></div>
      </section>
      <section
        className="gallery-masonry site-container"
        aria-label={`${title} photographs`}
      >
        {Array.from(
          { length: Math.ceil(Math.min(visibleCount, images.length) / 24) },
          (_, batch) => (
            <div className="gallery-batch" key={batch}>
              {images.slice(batch * 24, (batch + 1) * 24).map((src, offset) => {
                const index = batch * 24 + offset;
                const [width, height] = portfolioDimensions(src)!;
                return (
                  <button
                    className="gallery-photo"
                    type="button"
                    key={src}
                    onClick={event => { openerRef.current = event.currentTarget; setActive(index); }}
                    aria-label={`View photograph ${index + 1} of ${title}`}
                  >
                    <img
                      src={portfolioPreview(src)}
                      srcSet={portfolioSrcSet(src)}
                      sizes="(max-width: 600px) calc(100vw - 36px), (max-width: 1100px) calc(50vw - 51px), (min-width: 1512px) 449px, calc(33.33vw - 55px)"
                      alt={portfolioAlt(src) || `${title}, photograph ${index + 1}`}
                      width={width}
                      height={height}
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                    />
                    <span className="gallery-photo-open" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" /></svg></span>
                  </button>
                );
              })}
            </div>
          ),
        )}
        {visibleCount < images.length && (
          <div className="gallery-load-more">
            <p aria-live="polite">
              Showing {Math.min(visibleCount, images.length)} of {images.length}{" "}
              photographs
            </p>
            <button
              className="button button--outline"
              type="button"
              onClick={() => setVisibleCount((count) => count + 24)}
            >
              More of the story ↓
            </button>
          </div>
        )}
      </section>
      <nav className="gallery-next site-container" aria-label="Continue exploring">
        <div className="gallery-next-inquiry"><p className="eyebrow">Your story, next</p><h2>Let’s tell your story.</h2><Link className="text-link" to={`/Contact?session=${category.category}`}>Plan a session with Nikki <span aria-hidden="true">↗</span></Link></div>
        {next && (
          <Link
            className="gallery-next-story"
            to={`/gallery/${category.category}/${encodeURIComponent(next.name)}`}
          >
            <img src={portfolioPreview(`${category.path}/${next.name}/${next.featuredHorizontal}`)} alt="" width="100" height="120" loading="lazy" />
            <span><span className="eyebrow">Next story</span><strong>{next.title || formatSessionName(next.name)}</strong><span className="gallery-next-view">View photographs <GalleryArrow /></span></span>
          </Link>
        )}
      </nav>
      <dialog
        className="lightbox gallery-lightbox"
        ref={dialogRef}
        aria-label={`${title} photograph viewer`}
        onCancel={event => { event.preventDefault(); close(); }}
        onClose={() => setActive(null)}
      >
        {active !== null && images[active] && (
          <div className="lightbox-content">
            <div className="lightbox-top">
              <div><span className="gallery-lightbox-category">{categoryLabel}</span><span className="gallery-lightbox-title">{title}</span></div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close photograph viewer"
              >
                <span>Close</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="lightbox-image" onClick={event => { if (event.target === event.currentTarget) close(); }}>
              <img
                src={images[active]}
                alt={portfolioAlt(images[active]) || `${title}, photograph ${active + 1}`}
              />
            </div>
            <div className="gallery-lightbox-footer">
              <p className="gallery-lightbox-caption">{portfolioAlt(images[active]) || `${title}, photograph ${active + 1}`}</p>
              <div className="lightbox-bottom">
              <button
                type="button"
                onClick={() =>
                  setActive((active - 1 + images.length) % images.length)
                }
                aria-label="Previous photograph"
              >
                <GalleryArrow previous />
              </button>
              <span aria-live="polite" aria-atomic="true">
                <span className="visually-hidden">Photograph </span>{active + 1}<span aria-hidden="true"> / </span><span className="visually-hidden"> of </span>{images.length}
              </span>
              <button
                type="button"
                onClick={() => setActive((active + 1) % images.length)}
                aria-label="Next photograph"
              >
                <GalleryArrow />
              </button>
              </div>
              <span className="gallery-lightbox-hint">← → to explore <span aria-hidden="true">·</span> Esc to close</span>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
