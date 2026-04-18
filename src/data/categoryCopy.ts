import type {Categories} from "../components/MediaLibrary/MediaTypes";

interface CategoryCopy {
    description: string;
    lead: string;
}

const defaultCopy: CategoryCopy = {
    description: "Recent work from Nikki Dodge Photography.",
    lead: "Browse the full gallery and picture what your own session could feel like."
};

export const categoryCopy: Partial<Record<Categories, CategoryCopy>> = {
    Engagements: {
        description: "Relaxed engagement sessions built around the places, light, and rhythms that already feel like the two of you.",
        lead: "See how candid movement and gentle direction come together for photos that still feel natural."
    },
    Family: {
        description: "Connection-first family photos with enough structure to feel polished and enough freedom for real personalities to show up.",
        lead: "These galleries are built around movement, conversation, and the moments in between the poses."
    },
    Featured: {
        description: "A quick cross-section of favorite images pulled from recent weddings, portraits, and family sessions.",
        lead: "Start here if you want the fastest feel for Nikki's style across the whole portfolio."
    },
    Graduations: {
        description: "Senior and graduation portraits that feel confident, modern, and true to the season you are in right now.",
        lead: "Explore sessions with outfit variety, location ideas, and a mix of editorial and easygoing portraits."
    },
    Headshots: {
        description: "Clean, welcoming headshots for websites, speaking, LinkedIn, and personal brands.",
        lead: "The goal is straightforward: make you look capable, approachable, and like yourself."
    },
    Homes: {
        description: "Bright, detailed real estate photography that helps spaces feel open, warm, and ready to be seen.",
        lead: "These images balance architecture, light, and lived-in texture without overprocessing the space."
    },
    Lifestyles: {
        description: "Story-driven lifestyle sessions for couples, creatives, and everyday milestones that deserve more than a rushed photo.",
        lead: "These galleries lean into movement, texture, and the feeling of being present in your own life."
    },
    Music: {
        description: "Artist portraits and live music imagery with energy, atmosphere, and a strong sense of personality.",
        lead: "Look through sessions that mix performance grit with intentional portrait direction."
    },
    Representatives: {
        description: "Approachable political and community-facing photography designed to feel trustworthy, warm, and real.",
        lead: "These sessions focus on clarity, confidence, and images that can work across print and digital."
    },
    Sports: {
        description: "Athlete and team sessions that bring together movement, personality, and portrait-driven storytelling.",
        lead: "Browse action-forward images alongside the composed portraits families actually print and frame."
    },
    Videos: {
        description: "Motion work and highlight content for clients who want more than still photography.",
        lead: "Ask about custom coverage when you need both photo and video deliverables."
    },
    Weddings: {
        description: "Candid-first wedding coverage that protects the emotion, family connection, and quiet details that matter later.",
        lead: "Walk through real wedding galleries to see how the day unfolds from getting ready through the dance floor."
    }
};

export const getCategoryCopy = (category: Categories): CategoryCopy => {
    return categoryCopy[category] ?? defaultCopy;
};
