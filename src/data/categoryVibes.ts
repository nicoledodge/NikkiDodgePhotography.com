import type {Categories} from "../components/MediaLibrary/MediaTypes";

interface CategoryVibe {
    key: string;
    eyebrow: string;
    headline: string;
    bookingPrompt: string;
    mood: string;
    pace: string;
    ctaLabel: string;
}

const defaultVibe: CategoryVibe = {
    key: "featured",
    eyebrow: "Portfolio Lane",
    headline: "Real galleries with a clear path from inspiration to inquiry",
    bookingPrompt: "Tell Nikki what you are planning, what the photos need to do, and where the images will live.",
    mood: "Natural direction",
    pace: "Flexible coverage",
    ctaLabel: "Ask About This Work",
};

export const categoryVibes: Record<Categories, CategoryVibe> = {
    Engagements: {
        key: "engagements",
        eyebrow: "Couples & Engagements",
        headline: "Date-night energy, easy movement, and photos that still feel like the two of you",
        bookingPrompt: "Share the season, location ideas, and whether the images need to support save-the-dates, wedding decor, or a just-because gallery.",
        mood: "Romantic, relaxed",
        pace: "Movement-first",
        ctaLabel: "Plan A Couples Session",
    },
    Family: {
        key: "family",
        eyebrow: "Families",
        headline: "Connection-first galleries with enough structure for everyone to relax",
        bookingPrompt: "Send ages, preferred location, and the mix of playful, posed, and print-worthy images you want from the session.",
        mood: "Warm, candid",
        pace: "Kid-aware pacing",
        ctaLabel: "Ask About Family Photos",
    },
    Featured: {
        ...defaultVibe,
        eyebrow: "Featured Work",
    },
    Graduations: {
        key: "graduations",
        eyebrow: "Seniors & Graduates",
        headline: "Confident portraits with outfit variety, personality, and room to celebrate the milestone",
        bookingPrompt: "Share school, deadline, outfit count, and whether you want campus, city, studio-style, or outdoor portraits.",
        mood: "Confident, modern",
        pace: "Outfit-friendly",
        ctaLabel: "Book Senior Portraits",
    },
    Headshots: {
        key: "headshots",
        eyebrow: "Headshots",
        headline: "Clean portraits for people who need to look capable, approachable, and current",
        bookingPrompt: "Send the platforms or uses you need covered, from LinkedIn and websites to speaking bios and launch assets.",
        mood: "Clean, polished",
        pace: "Efficient setup",
        ctaLabel: "Ask About Headshots",
    },
    Homes: {
        key: "homes",
        eyebrow: "Homes & Spaces",
        headline: "Bright, useful images that help a space feel ready to be seen",
        bookingPrompt: "Share the address, square footage, deadline, and whether the photos support a listing, rental, staging portfolio, or brand story.",
        mood: "Open, detailed",
        pace: "Listing-ready",
        ctaLabel: "Ask About Property Photos",
    },
    Lifestyles: {
        key: "lifestyles",
        eyebrow: "Lifestyle & Creative",
        headline: "Movement, texture, and story-driven portraits for people building something personal",
        bookingPrompt: "Share the story, location, wardrobe direction, and how the images need to work across social, web, or launch materials.",
        mood: "Editorial, lived-in",
        pace: "Story-led",
        ctaLabel: "Plan A Lifestyle Shoot",
    },
    Music: {
        key: "music",
        eyebrow: "Music & Live Events",
        headline: "Stage light, crowd energy, artist portraits, and nights that do not sit still",
        bookingPrompt: "Send the venue, set time, access details, and whether you need performance coverage, BTS, promo portraits, or social clips.",
        mood: "Electric, vivid",
        pace: "Fast-moving",
        ctaLabel: "Ask About Music Coverage",
    },
    Representatives: {
        key: "representatives",
        eyebrow: "Public & Community",
        headline: "Trustworthy campaign and community imagery that feels human before it feels staged",
        bookingPrompt: "Share the event, candidate or organization, usage needs, and the mix of portraits, interaction, and documentary coverage.",
        mood: "Clear, credible",
        pace: "Message-aware",
        ctaLabel: "Ask About Community Coverage",
    },
    Sports: {
        key: "sports",
        eyebrow: "Sports & Teams",
        headline: "Action, personality, and athlete portraits with the energy still intact",
        bookingPrompt: "Share the sport, team size, game or portrait schedule, and whether you need action coverage, banners, senior-night images, or media-day portraits.",
        mood: "Bold, kinetic",
        pace: "Action-ready",
        ctaLabel: "Plan Sports Coverage",
    },
    Videos: {
        key: "videos",
        eyebrow: "Motion",
        headline: "Short-form coverage when the story needs movement, sound, and pace",
        bookingPrompt: "Share the platform, length, deadline, and whether you need a recap, reel, teaser, or behind-the-scenes cut.",
        mood: "Motion-first",
        pace: "Social-ready",
        ctaLabel: "Ask About Video",
    },
    Weddings: {
        key: "weddings",
        eyebrow: "Weddings",
        headline: "A full-day story with the emotion, family connection, and dance-floor energy protected",
        bookingPrompt: "Share your date, venue, rough timeline, and the parts of the day that matter most to you.",
        mood: "Emotional, polished",
        pace: "Timeline-guided",
        ctaLabel: "Ask About Wedding Coverage",
    },
};

export function getCategoryVibe(category: Categories): CategoryVibe {
    return categoryVibes[category] ?? defaultVibe;
}
