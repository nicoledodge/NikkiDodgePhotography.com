export type Categories =
    "Engagements"
    | "Family"
    | "Graduations"
    | "Homes"
    | "Headshots"
    | "Lifestyles"
    | "Music"
    | "Representatives"
    | "Sports"
    | "Videos"
    | "Weddings";

export const PortfolioPath = "/assets/images/Portfolio";

export const Paths: Record<Categories, string> = {
    Engagements: PortfolioPath + "/Engagements",
    Family: PortfolioPath + "/Family",
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
