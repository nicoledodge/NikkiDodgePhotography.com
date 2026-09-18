import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import mediaLibrary from "../components/MediaLibrary/MediaLibrary";
import {
  portfolioDimensions,
  portfolioPreview,
  portfolioSrcSet,
  portfolioAlt,
} from "../functions/portfolioPreview";
import { formatSessionName } from "./Portfolio";

export const GALLERY = "/gallery";

export default function Gallery() {
  const { categoryName, sessionName } = useParams();
  const category = Object.values(mediaLibrary).find(
    (item) => item.category.toLowerCase() === categoryName?.toLowerCase(),
  );
  const session = category?.sessions.find((item) => item.name === sessionName);
  const [active, setActive] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const images =
    session?.mediaFiles
      .filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file))
      .map((file) => `${category!.path}/${session.name}/${file}`)
      .filter((src) => Boolean(portfolioDimensions(src))) || [];
  const title = session?.title || formatSessionName(sessionName || "");
  const availableStories = category?.sessions.filter((item) => item.featuredHorizontal) || [];
  const currentStory = availableStories.findIndex((item) => item.name === sessionName);
  const next = availableStories.length > 1
    ? availableStories[(currentStory + 1) % availableStories.length]
    : undefined;

  useEffect(() => {
    dialogRef.current?.close();
    setActive(null);
    setVisibleCount(24);
  }, [categoryName, sessionName]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active === null || !images[active]) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
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
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [active, images.length]);
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
    <>
      <section className="gallery-intro site-container">
        <Link className="gallery-back" to={`/Portfolio/${category.category}`}>
          ← Back to {category.name.toLowerCase()}
        </Link>
        <p className="eyebrow">{category.category} / A photo story</p>
        <h1>{title}</h1>
        {session.description && <p className="gallery-description">{session.description}</p>}
        <p>{images.length} photographs. A moment worth keeping.</p>
        <Link className="text-link gallery-inquire" to={`/Contact?session=${category.category}`}>
          Plan a session with Nikki <span aria-hidden="true">↗</span>
        </Link>
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
                    onClick={() => setActive(index)}
                    aria-label={`View photograph ${index + 1} of ${title}`}
                  >
                    <img
                      src={portfolioPreview(src)}
                      srcSet={portfolioSrcSet(src)}
                      sizes="(max-width: 600px) calc(50vw - 27px), (max-width: 1000px) calc(50vw - 45px), 32vw"
                      alt={portfolioAlt(src) || `${title}, photograph ${index + 1}`}
                      width={width}
                      height={height}
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  </button>
                );
              })}
            </div>
          ),
        )}
        {visibleCount < images.length && (
          <div className="gallery-load-more">
            <p>
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
      <div className="gallery-next site-container">
        <Link className="text-link" to={`/Contact?session=${category.category}`}>
          Let’s tell your story ↗
        </Link>
        {next && (
          <Link
            className="text-link"
            to={`/gallery/${category.category}/${encodeURIComponent(next.name)}`}
          >
            Next story: {next.title || formatSessionName(next.name)} ↗
          </Link>
        )}
      </div>
      <dialog
        className="lightbox"
        ref={dialogRef}
        aria-label={`${title} photograph viewer`}
        onCancel={close}
        onClose={() => setActive(null)}
      >
        {active !== null && images[active] && (
          <div className="lightbox-content">
            <div className="lightbox-top">
              <span>{title}</span>
              <button
                type="button"
                onClick={close}
                aria-label="Close photograph viewer"
              >
                Close ×
              </button>
            </div>
            <div className="lightbox-image">
              <img
                src={images[active]}
                alt={portfolioAlt(images[active]) || `${title}, photograph ${active + 1}`}
              />
            </div>
            <div className="lightbox-bottom">
              <button
                type="button"
                onClick={() =>
                  setActive((active - 1 + images.length) % images.length)
                }
                aria-label="Previous photograph"
              >
                ←
              </button>
              <span aria-live="polite">
                {active + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => setActive((active + 1) % images.length)}
                aria-label="Next photograph"
              >
                →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
