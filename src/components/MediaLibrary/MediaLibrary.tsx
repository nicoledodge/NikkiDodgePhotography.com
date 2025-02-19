import {Engagements} from "./Engagements.tsx";
import {Family} from "./Family.tsx";
import {Categories, Category} from "./MediaTypes.tsx";
import {Graduations} from "./Graduations.tsx";
import {Headshots} from "./Headshots.tsx";
import {Homes} from "./Homes.tsx";
import {Lifestyles} from "./Lifestyles.tsx";
import {Music} from "./Music.tsx";
import {Representatives} from "./Representatives.tsx";
import {Sports} from "./Sports.tsx";
import {Videos} from "./Videos.tsx";
import {Weddings} from "./Weddings.tsx";
import {Featured} from "./Featured.tsx";

export const mediaLibrary: Record<Categories, Category> = {
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
}

export const Sessions = Object.values(mediaLibrary)
    .flatMap((category) => {
        if (category.name === "Videos") return [];
        return category.sessions.map((session) => ({
            ...session,
            mediaFiles: session.mediaFiles.map(
                (mediaFile) => category.path + "/" + session.name + "/" + mediaFile
            ),
        }));
    })

export const Photos: string[] = Sessions.flatMap((session) => session.mediaFiles);

export default mediaLibrary;


