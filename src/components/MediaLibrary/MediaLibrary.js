import { Engagements } from "./Engagements";
import { Family } from "./Family";
import { Graduations } from "./Graduations";
import { Headshots } from "./Headshots";
import { Homes } from "./Homes";
import { Lifestyles } from "./Lifestyles";
import { Music } from "./Music";
import { Representatives } from "./Representatives";
import { Sports } from "./Sports";
import { Videos } from "./Videos";
import { Weddings } from "./Weddings";
import { Featured } from "./Featured";
export const mediaLibrary = {
    Engagements,
    Family,
    Featured,
    Graduations,
    Headshots,
    Homes,
    Lifestyles,
    Music,
    Representatives,
    Sports,
    Videos,
    Weddings
};
export const Sessions = Object.values(mediaLibrary)
    .flatMap((category) => {
    if (category.name === "Videos")
        return [];
    return category.sessions.map((session) => ({
        ...session,
        mediaFiles: session.mediaFiles.map((mediaFile) => category.path + "/" + session.name + "/" + mediaFile),
    }));
});
export const Photos = Sessions.flatMap((session) => session.mediaFiles);
export default mediaLibrary;
