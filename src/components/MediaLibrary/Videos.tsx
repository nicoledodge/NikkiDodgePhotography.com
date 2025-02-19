import {Category, Paths, Session} from "./MediaTypes";

const VideoSessions: Session[] = [
    {
        name: "Asorted",
        featuredVertical: "",
        featuredHorizontal: "",
        mediaFiles: [
            "FLYNYON.mp4",
            "LPworkshop.mp4"
        ]
    }
]


export const Videos: Category = {
    name: "Videos",
    path: Paths.Videos,
    category: "Videos",
    featuredVertical: "",
    featuredHorizontal: "",
    sessions: VideoSessions
}

