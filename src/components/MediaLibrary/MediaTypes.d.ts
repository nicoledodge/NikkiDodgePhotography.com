export type Categories = "Engagements" | "Family" | "Featured" | "Graduations" | "Homes" | "Headshots" | "Lifestyles" | "Music" | "Representatives" | "Sports" | "Videos" | "Weddings";
export declare const PortfolioPath = "/assets/images/Portfolio";
export declare const Paths: Record<Categories, string>;
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
export interface SpecificSession extends Category, Session {
}
export {};
