export interface BlogArticle {
    slug: string;
    title: string;
    publishedAt: string;
    location: string;
    readTime: string;
    heroImage: string;
    excerpt: string;
    tags: string[];
    highlights: string[];
    featured?: boolean;
}

export const blogArticles: BlogArticle[] = [
    {
        slug: "winter-light-mountain-elopement",
        title: "Sunrise Vows in the Cascades",
        publishedAt: "January 12, 2025",
        location: "Mount Rainier National Park",
        readTime: "4 min read",
        heroImage: "/assets/images/featured-image-01.jpg",
        excerpt:
            "Brittany and Logan hiked in before dawn for a private first look in the snow. See how we kept them warm, comfortable, and absolutely glowing for every frame.",
        tags: ["Elopement", "PNW", "Planning Tips"],
        highlights: [
            "Packing list essentials for sub-freezing ceremonies",
            "Lighting set-up for blue hour portraits without losing natural ambience",
            "A vendor team who specializes in leave-no-trace celebrations"
        ],
        featured: true
    },
    {
        slug: "urban-loft-wedding-with-film-soul",
        title: "A Modern Loft Wedding with Film-Forward Flair",
        publishedAt: "November 8, 2024",
        location: "Block 41, Seattle",
        readTime: "6 min read",
        heroImage: "/assets/images/featured-image-02.jpg",
        excerpt:
            "Rachel and Dev blended South Asian tradition with a sleek downtown celebration. Here’s how we layered digital and 35mm film to tell their story.",
        tags: ["Weddings", "Film Photography", "Seattle"],
        highlights: [
            "Timeline tweaks that protected natural window light",
            "Favorite film stocks for indoor ceremonies",
            "Gallery wall inspiration for your reception lounge"
        ]
    },
    {
        slug: "whidbey-island-family-session",
        title: "Playful Tides: The Harper Family at Whidbey",
        publishedAt: "August 19, 2024",
        location: "Deception Pass, Washington",
        readTime: "3 min read",
        heroImage: "/assets/images/featured-image-03.jpg",
        excerpt:
            "Bare feet, salty hair, and one very enthusiastic golden retriever. Come behind the scenes of this connection-first family session on the shore.",
        tags: ["Family", "Lifestyle", "Outdoors"],
        highlights: [
            "Prompt-based posing that keeps kids engaged",
            "How to prep pets (and sand-loving toddlers) for beach shoots",
            "Editing approach for preserving pastel sunset tones"
        ]
    },
    {
        slug: "seattle-brand-shoot-with-heart",
        title: "Brand Storytelling for a Floral Designer",
        publishedAt: "May 2, 2024",
        location: "Pioneer Square, Seattle",
        readTime: "5 min read",
        heroImage: "/assets/images/featured-image-04.jpg",
        excerpt:
            "Ever Bloom Studio needed images that felt like open arms—warm, artful, and unmistakably welcoming. Here’s the creative brief and the final gallery.",
        tags: ["Branding", "Small Business", "Seattle"],
        highlights: [
            "Pre-shoot questionnaire prompts that uncover brand tone",
            "Studio vs. on-location setups for lifestyle brands",
            "Deliverable checklist to support a launch-week marketing plan"
        ]
    }
];
