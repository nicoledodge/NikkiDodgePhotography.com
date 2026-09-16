import { Link } from "react-router-dom";
import { useSiteSettings } from "../site/SiteSettingsContext";

const work = [
  {
    title: "Weddings",
    detail: "The day. The feeling. Everything in between.",
    category: "Weddings",
    image: "wedding",
    alt: "Newlyweds sharing a quiet moment between stone columns",
  },
  {
    title: "Couples",
    detail: "A little adventure. A lot of you.",
    category: "Engagements",
    image: "couples",
    alt: "A couple together in warm evening light",
  },
  {
    title: "Portraits",
    detail: "For who you are, right now.",
    category: "Graduations",
    image: "portraits",
    alt: "Graduation portrait framed by an archway",
  },
  {
    title: "Live music",
    detail: "Turn it up. Feel it all over again.",
    category: "Music",
    image: "music",
    alt: "Live performance photographed by Nikki Dodge",
  },
  {
    title: "Sports",
    detail: "The energy behind every moment.",
    category: "Sports",
    image: "sports",
    alt: "An athlete photographed in action",
  },
  {
    title: "Family",
    detail: "Your people. Just as they are.",
    category: "Family",
    image: "family",
    alt: "A family spending time together outdoors",
  },
];

export default function Home() {
  const { siteSettings } = useSiteSettings();
  return (
    <>
      <section
        className="home-intro site-container"
        aria-labelledby="home-title"
      >
        <div className="intro-meta">
          <p className="eyebrow">Colorado photographer</p>
          <span>People. Places. A feeling.</span>
        </div>
        <div className="intro-heading">
          <h1 id="home-title">
            Life, <em>as you feel it.</em>
          </h1>
          <p>
            Honest photographs.
            <br />
            For the moments that mean everything.
          </p>
        </div>
      </section>
      <section className="hero-wrap" aria-label="Featured wedding photograph">
        <Link
          to="/gallery/Weddings/Cynthia%26Isaac"
          className="hero-image-link"
          aria-label="Explore Cynthia and Isaac’s wedding gallery"
        >
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet="/assets/editorial/wedding-640.webp"
            />
            <img
              className="hero-image"
              src="/assets/editorial/wedding-hero.webp"
              alt="Cynthia and Isaac embracing beneath monumental stone columns on their wedding day"
              width="2000"
              height="1333"
              fetchPriority="high"
            />
          </picture>
          <span className="hero-gallery-link">
            A day to remember <span aria-hidden="true">↗</span>
          </span>
        </Link>
        <div className="image-caption site-container">
          <span>Weddings, portraits & everything that moves you.</span>
          <a href="#selected-work">
            Explore the work <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <section className="home-statement site-container">
        <p className="eyebrow">A little less posing. A little more living.</p>
        <h2>
          The best photographs
          <br />
          bring you <em>right back.</em>
        </h2>
        <p>
          A familiar laugh. The quiet before the vows. The energy of a crowd.
          <br className="desktop-break" /> I’m here for the real moments, and
          the people who make them matter.
        </p>
      </section>
      <section
        id="selected-work"
        className="selected-work site-container"
        aria-labelledby="selected-work-title"
      >
        <div className="section-topline">
          <div>
            <p className="eyebrow">01 / The portfolio</p>
            <h2 id="selected-work-title">
              A few ways to <em>feel it.</em>
            </h2>
          </div>
          <Link className="text-link" to="/Portfolio">
            Explore all work <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="work-grid">
          {work.map((item, i) => (
            <Link
              className="work-item"
              to={`/Portfolio/${item.category}`}
              key={item.category}
            >
              <div className="work-image">
                <img
                  src={`/assets/editorial/${item.image}.webp`}
                  srcSet={`/assets/editorial/${item.image}-640.webp 640w, /assets/editorial/${item.image}.webp 1200w`}
                  sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
                  alt={item.alt}
                  loading="lazy"
                  width="800"
                  height="1000"
                />
              </div>
              <div className="work-title">
                <h3>{item.title}</h3>
                <span aria-hidden="true">↗</span>
              </div>
              <p>{item.detail}</p>
              <span className="work-number" aria-hidden="true">
                0{i + 1}
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-about" aria-labelledby="meet-nikki">
        <div className="site-container home-about-grid">
          <div className="about-photograph">
            <img
              src={
                siteSettings.profilePhotoUrl ===
                "/assets/images/profilePhoto.jpg"
                  ? "/assets/editorial/nikki.webp"
                  : siteSettings.profilePhotoUrl
              }
              alt="Nikki Dodge, Colorado photographer"
              loading="lazy"
              width="1000"
              height="1000"
            />
            <span className="photo-note">
              A real person, behind the camera.
            </span>
          </div>
          <div className="about-copy">
            <p className="eyebrow">02 / The person behind the lens</p>
            <h2 id="meet-nikki">
              Hey, I’m Nikki.
              <br />
              <em>Come as you are.</em>
            </h2>
            <p>
              I’m a Colorado photographer drawn to good light, real connection,
              and all the beautiful things that happen when you forget about the
              camera.
            </p>
            <p>
              From a mountain wedding to the front row of a show, I bring a calm
              presence, a curious eye, and just enough direction to help you
              feel like yourself.
            </p>
            <Link className="text-link" to="/howdy">
              A little more about me <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="home-experience site-container">
        <div>
          <p className="eyebrow">03 / The experience</p>
          <h2>
            Be in the moment.
            <br />
            <em>I’ll take it from here.</em>
          </h2>
        </div>
        <div className="experience-copy">
          <p>
            You don’t need to know what to do with your hands. Together, we’ll
            find the light, make a little space, and create photographs that
            feel like you.
          </p>
          <Link className="text-link" to="/pricing">
            Explore the experience & pricing <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <div className="closing-image">
        <img
          src="/assets/editorial/forest-wedding.webp"
          alt="An intimate wedding ceremony surrounded by towering forest trees"
          loading="lazy"
          width="1800"
          height="1200"
        />
      </div>
    </>
  );
}
