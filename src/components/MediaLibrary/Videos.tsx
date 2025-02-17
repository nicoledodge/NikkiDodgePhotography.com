import {Category, Paths, Session} from "./MediaTypes.tsx";

const VideoSessions: Session[] = [
    {
        name: "Asorted",
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
    featured: false,
    featuredMedia: Paths.Videos + "/video-01.jpg",
    sessions: VideoSessions
}

