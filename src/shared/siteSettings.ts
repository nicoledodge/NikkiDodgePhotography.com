export interface SiteSettings {
    businessName: string;
    logoUrl: string;
    profilePhotoUrl: string;
    contactEmail: string;
    contactPhone: string;
    serviceArea: string;
    heroTitle: string;
    heroBody: string;
    heroPrimaryCtaLabel: string;
    heroSecondaryCtaLabel: string;
    homeAboutTitle: string;
    homeAboutBody: string;
    homeAvailabilityCtaLabel: string;
    aboutPageTitle: string;
    aboutPageBody: string;
    profileName: string;
    profileRole: string;
    pricingPageTitle: string;
    pricingPageBody: string;
    pricingPageCtaLabel: string;
    contactPageTitle: string;
    contactPageBody: string;
    inquirySectionEyebrow: string;
    inquirySectionTitle: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    buttonColor: string;
    darkBackgroundColor: string;
    highlightColor: string;
}

export const defaultSiteSettings: SiteSettings = {
    businessName: "Nikki Dodge Photography",
    logoUrl: "/assets/images/logo-black.png",
    profilePhotoUrl: "/assets/images/profilePhoto.jpg",
    contactEmail: "nicole@nikkidodgephotography.com",
    contactPhone: "972-523-3420",
    serviceArea: "Highlands Ranch, Denver, and destinations across Colorado",
    heroTitle: "Colorado photography that feels *personal*, calm, and worth remembering.",
    heroBody: "Nikki photographs weddings, engagements, graduates, families, and creative brands with a candid-first approach that keeps the experience relaxed, intentional, and true to you.",
    heroPrimaryCtaLabel: "View the Portfolio",
    heroSecondaryCtaLabel: "Start Your Inquiry",
    homeAboutTitle: "A *guided* experience with room for real *emotion*",
    homeAboutBody: "Nikki Dodge Photography is built for clients who want beautiful images without feeling like they are performing all day. From wedding timelines and engagement locations to senior outfit changes and family pacing, the process stays simple, communicative, and centered on the people in front of the camera.",
    homeAvailabilityCtaLabel: "Ask About Availability",
    aboutPageTitle: "Meet *Nikki Dodge*, your Colorado wedding and portrait *Photographer*",
    aboutPageBody: "Nikki works with couples, families, graduates, and creative businesses who want images that look polished without feeling stiff. The approach is equal parts preparation and intuition: good light, steady communication, and enough direction to help people relax.",
    profileName: "Nikki Dodge",
    profileRole: "Wedding, portrait, and lifestyle photographer based in Highlands Ranch, Colorado.",
    pricingPageTitle: "Invest in *Timeless Memories*",
    pricingPageBody: "These collections are built to make the booking decision easier, not more confusing. Wedding coverage starts with clear essentials and scales up for clients who want more time, more portraits, or both. Families, graduates, headshots, and brand sessions can be quoted separately based on scope.",
    pricingPageCtaLabel: "Let's Chat About Your Day",
    contactPageTitle: "Reach out about your *session, wedding, or project*",
    contactPageBody: "Use this page to start the conversation. Share what you are planning, when you need it, and what kind of images matter most. Nikki will follow up with next steps, availability, and the best fit for your timeline.",
    inquirySectionEyebrow: "Start Your Inquiry",
    inquirySectionTitle: "Tell Nikki what you are planning and get the conversation moving",
    primaryColor: "#2a261e",
    secondaryColor: "#ede7db",
    accentColor: "#b58cc4",
    buttonColor: "#a89a78",
    darkBackgroundColor: "#131008",
    highlightColor: "#ffffff",
};

const stringSettingKeys = [
    "businessName",
    "logoUrl",
    "profilePhotoUrl",
    "contactEmail",
    "contactPhone",
    "serviceArea",
    "heroTitle",
    "heroBody",
    "heroPrimaryCtaLabel",
    "heroSecondaryCtaLabel",
    "homeAboutTitle",
    "homeAboutBody",
    "homeAvailabilityCtaLabel",
    "aboutPageTitle",
    "aboutPageBody",
    "profileName",
    "profileRole",
    "pricingPageTitle",
    "pricingPageBody",
    "pricingPageCtaLabel",
    "contactPageTitle",
    "contactPageBody",
    "inquirySectionEyebrow",
    "inquirySectionTitle",
] as const satisfies ReadonlyArray<keyof SiteSettings>;

const colorSettingKeys = [
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "buttonColor",
    "darkBackgroundColor",
    "highlightColor",
] as const satisfies ReadonlyArray<keyof SiteSettings>;

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

export type SiteSettingsUpdate = Partial<Record<keyof SiteSettings, unknown>>;

export function mergeSiteSettings(input?: SiteSettingsUpdate): SiteSettings {
    if (!input) {
        return { ...defaultSiteSettings };
    }

    const merged: SiteSettings = { ...defaultSiteSettings };

    for (const key of stringSettingKeys) {
        const candidate = input[key];
        if (typeof candidate === "string") {
            const trimmed = candidate.trim();
            if (trimmed.length > 0) {
                merged[key] = trimmed;
            }
        }
    }

    for (const key of colorSettingKeys) {
        const candidate = input[key];
        if (typeof candidate === "string") {
            const trimmed = candidate.trim();
            if (hexColorPattern.test(trimmed)) {
                merged[key] = trimmed.toLowerCase();
            }
        }
    }

    return merged;
}
