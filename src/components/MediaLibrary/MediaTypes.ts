export type Categories =
    "Engagements"
    | "Family"
    | "Featured"
    | "Graduations"
    | "Homes"
    | "Headshots"
    | "Lifestyles"
    | "Music"
    | "Representatives"
    | "Sports"
    | "Videos"
    | "Weddings";

const defaultPortfolioPath = "/assets/images/Portfolio";
const configuredPortfolioPath = import.meta.env.VITE_PORTFOLIO_IMAGE_BASE_URL?.trim();

export const PortfolioPath = (configuredPortfolioPath && configuredPortfolioPath.length > 0
    ? configuredPortfolioPath
    : defaultPortfolioPath
).replace(/\/+$/, "");

export const Paths: Record<Categories, string> = {
    Engagements: PortfolioPath + "/Engagements",
    Family: PortfolioPath + "/Family",
    Featured: PortfolioPath + "/Featured",
    Graduations: PortfolioPath + "/Graduations",
    Homes: PortfolioPath + "/Homes",
    Headshots: PortfolioPath + "/Headshots",
    Lifestyles: PortfolioPath + "/Lifestyles",
    Music: PortfolioPath + "/Music",
    Representatives: PortfolioPath + "/Representatives",
    Sports: PortfolioPath + "/Sports",
    Videos: PortfolioPath + "/Videos",
    Weddings: PortfolioPath + "/Weddings"
};

interface FeaturedMedia {
    featuredHorizontal: string;
    featuredVertical: string;
}

export interface Session extends FeaturedMedia {
    name: string;
    mediaFiles: string[];
}

export interface Category extends FeaturedMedia {
    name: string;
    path: string;
    category: Categories;
    sessions: Session[];
}

export interface SpecificSession extends Category, Session {}
