import manifest from "./curatedPortfolio.json";
import { PortfolioPath, type Categories } from "../components/MediaLibrary/MediaTypes";

export interface CuratedPhoto {
  file: string;
  width: number;
  height: number;
  alt: string;
  variants: { file: string; width: number }[];
}

export interface CuratedStory {
  category: Categories;
  name: string;
  title: string;
  description: string;
  cover: number;
  photos: CuratedPhoto[];
}

export const curatedStories = manifest.stories as CuratedStory[];

export const storyPhotoUrl = (story: CuratedStory, photo = story.photos[story.cover]) =>
  `${PortfolioPath}/${story.category}/${story.name}/${photo.file}`;

export const storyUrl = (story: CuratedStory) =>
  `/gallery/${story.category}/${encodeURIComponent(story.name)}`;
