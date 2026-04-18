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
        slug: "roxborough-engagement-session-guide",
        title: "How To Plan A Golden Hour Engagement Session In Colorado",
        publishedAt: "January 12, 2025",
        location: "Roxborough State Park, Colorado",
        readTime: "4 min read",
        heroImage: "/assets/images/featured-image-01.jpg",
        excerpt:
            "The best engagement sessions feel more like a date than a production. Start with timing, terrain, outfits, and the pacing that keeps you comfortable in front of the camera.",
        tags: ["Engagements", "Colorado", "Planning Tips"],
        highlights: [
            "Where the light drops first and how that affects your start time",
            "What to wear when the forecast shifts twenty degrees in a day",
            "How to pick a location that matches your relationship instead of a trend"
        ],
        featured: true
    },
    {
        slug: "fall-senior-photo-outfits-colorado",
        title: "What To Wear For Colorado Senior Photos In The Fall",
        publishedAt: "November 8, 2024",
        location: "Highlands Ranch and Denver South",
        readTime: "6 min read",
        heroImage: "/assets/images/featured-image-02.jpg",
        excerpt:
            "Layering, color, and movement matter more than chasing a single Pinterest outfit. Here’s how Nikki helps graduates plan a set of looks that still feel like them.",
        tags: ["Graduations", "Style", "Colorado"],
        highlights: [
            "How to mix textures without making the photos feel busy",
            "Shoes that work on trails, streets, and grassy fields",
            "The easiest way to build variety without packing your whole closet"
        ]
    },
    {
        slug: "chatfield-family-session-prep",
        title: "How To Prep For A Relaxed Family Session",
        publishedAt: "August 19, 2024",
        location: "Chatfield State Park, Colorado",
        readTime: "3 min read",
        heroImage: "/assets/images/featured-image-03.jpg",
        excerpt:
            "Family photos go better when everyone knows what to expect. This guide covers timing, snacks, pacing, and how Nikki keeps kids engaged without turning the session into a chore.",
        tags: ["Family", "Lifestyle", "Preparation"],
        highlights: [
            "Why shorter prompts beat forced smiles every time",
            "What parents can do before the session to keep energy steady",
            "How to choose a location with enough room for kids to move"
        ]
    },
    {
        slug: "brand-photos-that-still-feel-human",
        title: "Brand Photos That Still Feel Human",
        publishedAt: "May 2, 2024",
        location: "Denver, Colorado",
        readTime: "5 min read",
        heroImage: "/assets/images/featured-image-04.jpg",
        excerpt:
            "If you need brand photos for a small business, the goal is not to look overly polished or generic. It is to look credible, welcoming, and recognizable the first time someone lands on your site.",
        tags: ["Branding", "Small Business", "Marketing"],
        highlights: [
            "Shot lists that support websites, social, and launch assets",
            "How to choose a location that reinforces the brand without overpowering it",
            "Why expression and body language matter more than props"
        ]
    }
];
