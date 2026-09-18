import { Link } from "react-router-dom";
import { useSiteSettings } from "../site/SiteSettingsContext";
import { curatedStories, storyPhotoUrl, storyUrl } from "../data/curatedPortfolio";
import { portfolioPreview, portfolioSrcSet } from "../functions/portfolioPreview";
import "../styles/portfolio-refresh.css";

const services = [
  ["Weddings", "Weddings & elopements"],
  ["Engagements", "Couples"],
  ["Graduations", "Seniors & graduates"],
  ["Family", "Families"],
  ["Music", "Live music"],
  ["Sports", "Sports"],
];
const labels: Record<string, string> = {
  Weddings: "Weddings & elopements",
  Graduations: "Seniors & graduates",
  Music: "Live music",
  Family: "Family",
};

export default function Home() {
  const { siteSettings } = useSiteSettings();
  const proposal = curatedStories.find((story) => story.category === "Engagements");
  const wedding = curatedStories.find((story) => story.category === "Weddings");
  const highlights = curatedStories.filter((story) => story.category !== "Engagements");

  return (
    <>
      <section className="home-intro site-container" aria-labelledby="home-title">
        <div className="intro-meta">
          <p className="eyebrow">Highlands Ranch · Denver · Colorado</p>
          <span>Weddings. Portraits. Life in between.</span>
        </div>
        <div className="intro-heading refresh-intro-heading">
          <h1 id="home-title">Life, <em>as you feel it.</em></h1>
          <div className="intro-invitation">
            <p>Honest photographs. Room to be yourself.<br /> Let’s make something worth keeping.</p>
            <Link className="text-link" to="/Contact">Plan your session <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="story-hero" aria-label="Featured photography">
        {proposal && (
          <Link className="story-hero-main" to={storyUrl(proposal)} aria-label={`Explore ${proposal.title.toLowerCase()}`}>
            <img src={storyPhotoUrl(proposal)} srcSet={portfolioSrcSet(storyPhotoUrl(proposal))}
              sizes="(max-width: 700px) 100vw, 67vw"
              alt={proposal.photos[proposal.cover].alt}
              width={proposal.photos[proposal.cover].width} height={proposal.photos[proposal.cover].height}
              fetchPriority="high" />
            <span className="story-hero-caption"><span>A little adventure. A very big yes.</span><span aria-hidden="true">↗</span></span>
          </Link>
        )}
        {wedding && (
          <Link className="story-hero-side" to={storyUrl(wedding)} aria-label={`Explore ${wedding.title.toLowerCase()}`}>
            <img src={portfolioPreview(storyPhotoUrl(wedding))} srcSet={portfolioSrcSet(storyPhotoUrl(wedding))}
              sizes="(max-width: 700px) 50vw, 33vw"
              alt={wedding.photos[wedding.cover].alt}
              width={wedding.photos[wedding.cover].width} height={wedding.photos[wedding.cover].height} />
            <span className="story-hero-caption"><span>Just the two of you.</span><span aria-hidden="true">↗</span></span>
          </Link>
        )}
      </section>
      <div className="image-caption site-container">
        <span>Good light. Real connection. Your kind of story.</span>
        <a href="#selected-work">Explore the work <span aria-hidden="true">↓</span></a>
      </div>

      <section className="story-selection site-container" id="selected-work" aria-labelledby="selected-work-title">
        <div className="section-topline">
          <div>
            <p className="eyebrow">A few stories, thoughtfully told</p>
            <h2 id="selected-work-title">More life. <em>More feeling.</em></h2>
          </div>
          <Link className="text-link" to="/Portfolio">The full portfolio <span aria-hidden="true">↗</span></Link>
        </div>
        <nav className="home-service-links" aria-label="Explore photography services">
          {services.map(([category, label]) => <Link key={category} to={`/Portfolio/${category}`}>{label}<span aria-hidden="true">↗</span></Link>)}
        </nav>
        <div className="new-stories-grid">
          {highlights.map((story) => {
            const photo = story.photos[story.cover];
            const src = storyPhotoUrl(story);
            return (
              <Link className="new-story" key={story.name} to={storyUrl(story)}>
                <div className="new-story-photo"><img src={portfolioPreview(src)} srcSet={portfolioSrcSet(src)}
                  sizes="(max-width: 700px) calc(50vw - 28px), 24vw" alt={photo.alt}
                  loading="lazy" decoding="async" width={photo.width} height={photo.height} /></div>
                <p className="new-story-category">{labels[story.category] || story.category}</p>
                <div className="new-story-title"><h3>{story.title}</h3><span aria-hidden="true">↗</span></div>
                <p className="new-story-description">{story.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-about" aria-labelledby="meet-nikki">
        <div className="site-container home-about-grid">
          <div className="about-photograph">
            <img src={siteSettings.profilePhotoUrl === "/assets/images/profilePhoto.jpg" ? "/assets/editorial/nikki.webp" : siteSettings.profilePhotoUrl}
              alt="Nikki Dodge, Colorado photographer" loading="lazy" width="1000" height="1000" />
            <span className="photo-note">A real person, behind the camera.</span>
          </div>
          <div className="about-copy">
            <p className="eyebrow">The person behind the lens</p>
            <h2 id="meet-nikki">Hey, I’m Nikki.<br /><em>Come as you are.</em></h2>
            <p>I’m a Colorado photographer drawn to good light, real connection, and all the beautiful things that happen when you forget about the camera.</p>
            <p>From a mountain wedding to the front row of a show, I bring a calm presence, a curious eye, and just enough direction to help you feel like yourself.</p>
            <Link className="text-link" to="/howdy">A little more about me <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="home-experience site-container" aria-labelledby="experience-title">
        <div><p className="eyebrow">A little guidance. A lot of room to be you.</p>
          <h2 id="experience-title">Be in the moment.<br /><em>I’ll take it from here.</em></h2></div>
        <div className="experience-copy">
          <p>You don’t need to know what to do with your hands. We’ll talk through your ideas, find the right setting, and make space for the moments you want to remember.</p>
          <div className="experience-links">
            <Link className="text-link" to="/pricing">See the experience & pricing <span aria-hidden="true">↗</span></Link>
            <Link className="text-link" to="/Contact">Ask about availability <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
      <div className="closing-image">
        <img src="/assets/editorial/forest-wedding.webp" srcSet="/assets/editorial/forest-wedding-640.webp 640w, /assets/editorial/forest-wedding.webp 1800w"
          sizes="100vw" alt="An intimate wedding ceremony surrounded by towering forest trees" loading="lazy" width="1800" height="1200" />
      </div>
    </>
  );
}
