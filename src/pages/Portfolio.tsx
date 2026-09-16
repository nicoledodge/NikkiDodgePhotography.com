import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import mediaLibrary from "../components/MediaLibrary/MediaLibrary";
import { getCategoryCopy } from "../data/categoryCopy";
import { portfolioPreview } from "../functions/portfolioPreview";

export const PORTFOLIO = "/Portfolio";
const order = [
  "Weddings",
  "Engagements",
  "Graduations",
  "Family",
  "Music",
  "Sports",
  "Lifestyles",
  "Headshots",
  "Homes",
  "Representatives",
];
const labels: Record<string, string> = {
  Engagements: "Couples",
  Graduations: "Seniors & graduates",
  Lifestyles: "Lifestyle",
  Representatives: "Community",
  Homes: "Spaces",
  Music: "Live music",
};
export const formatSessionName = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/&/g, " & ")
    .replace("Asorted", "On stage");
const categories = Object.values(mediaLibrary)
  .filter(
    (c) =>
      c.category !== "Videos" &&
      c.category !== "Featured" &&
      c.sessions.length > 0,
  )
  .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));

export default function Portfolio() {
  const { categoryName, search: routeSearch } = useParams();
  const [search, setSearch] = useState(routeSearch || "");
  useEffect(() => setSearch(routeSearch || ""), [categoryName, routeSearch]);
  const selected = categories.find(
    (c) => c.category.toLowerCase() === categoryName?.toLowerCase(),
  );
  const query = search.trim().toLowerCase();
  const sessions = (selected ? [selected] : categories)
    .flatMap((category) =>
      category.sessions
        .filter((session) =>
          session.mediaFiles.some((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)),
        )
        .map((session) => ({ category, session })),
    )
    .filter(
      ({ category, session }) =>
        !query ||
        `${session.name} ${formatSessionName(session.name)} ${category.name} ${labels[category.category] || ""}`
          .toLowerCase()
          .includes(query),
    );
  return (
    <div className="site-container">
      <section className="page-intro portfolio-intro">
        <div>
          <p className="eyebrow">
            The portfolio /{" "}
            {selected
              ? labels[selected.category] || selected.category
              : "Selected stories"}
          </p>
          <h1>
            {selected ? (
              labels[selected.category] || selected.category
            ) : (
              <>
                Every frame,
                <br />
                <em>a feeling.</em>
              </>
            )}
          </h1>
        </div>
        <p>
          {selected
            ? getCategoryCopy(selected.category).description
            : "Big days. Everyday beauty. The moments in between. Explore the stories, and find a little of yourself in them."}
        </p>
      </section>
      <div className="portfolio-tools">
        <nav
          className="portfolio-filters"
          aria-label="Filter photography by category"
        >
          <Link
            to={PORTFOLIO}
            aria-current={!categoryName ? "page" : undefined}
          >
            All work
          </Link>
          {categories.map((category) => (
            <Link
              key={category.category}
              to={`${PORTFOLIO}/${category.category}`}
              aria-current={
                selected?.category === category.category ? "page" : undefined
              }
            >
              {labels[category.category] || category.category}
            </Link>
          ))}
        </nav>
        <label className="portfolio-search">
          <span className="visually-hidden">Search galleries</span>
          <input
            type="search"
            placeholder="Find a gallery…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span aria-hidden="true">⌕</span>
        </label>
      </div>
      <section className="portfolio-results" aria-label="Photography galleries">
        <p className="results-count" role="status">
          {sessions.length} {sessions.length === 1 ? "story" : "stories"}
          {query ? ` matching “${search.trim()}”` : " to explore"}
        </p>
        {categoryName && !selected ? (
          <div className="empty-state">
            <h2>Let’s find your story.</h2>
            <p>That collection isn’t available.</p>
            <Link className="text-link" to={PORTFOLIO}>
              Browse all work ↗
            </Link>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <h2>No galleries found.</h2>
            <p>Try a name or another type of photography.</p>
            <button
              type="button"
              className="button"
              onClick={() => setSearch("")}
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="portfolio-grid">
            {sessions.map(({ category, session }, index) => {
              const original = `${category.path}/${session.name}/${session.featuredVertical || session.featuredHorizontal || session.mediaFiles[0]}`;
              return (
                <Link
                  className="portfolio-card"
                  key={`${category.category}/${session.name}`}
                  to={`/gallery/${category.category}/${encodeURIComponent(session.name)}`}
                >
                  <div className="portfolio-card-image">
                    <img
                      src={portfolioPreview(original)}
                      alt={`${formatSessionName(session.name)} — ${labels[category.category] || category.category} photography`}
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                      width="800"
                      height="1000"
                    />
                  </div>
                  <div className="portfolio-card-caption">
                    <h2>{formatSessionName(session.name)}</h2>
                    <span aria-hidden="true">↗</span>
                  </div>
                  <p>
                    {labels[category.category] || category.category} / View the
                    story
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
