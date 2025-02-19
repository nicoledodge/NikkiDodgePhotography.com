import {Category, Paths, Session} from "./MediaTypes.tsx";

const FeaturedSession: Session[] = [
    {
        name: "Horizontal",
        featuredHorizontal: "IMG_3640.jpg",
        featuredVertical: "",
        mediaFiles: [
            "IMG_3640.jpg",
            "IMG_3665.jpg",
            "IMG_3773.jpg",
            "IMG_3778.jpg",
            "IMG_6213.jpg",
            "IMG_8001.jpg",
            "IMG_8127.jpg",
            "IMG_8385.jpg",
            "IMG_8392.jpg",
            "IMG_8398.jpg",
            "IMG_8441.jpg",
            "IMG_8456.jpg",
            "IMG_8461.jpg",
            "IMG_8467.jpg",
            "IMG_8631.jpg",
            "IMG_8647.jpg",
            "IMG_8688.jpg",
            "IMG_8974.jpg",
            "IMG_9621.jpg",
            "IMG_9700.jpg",
        ]
    },
    {
        name: "Vertical",
        featuredHorizontal: "",
        featuredVertical: "IMG_3709.jpg",
        mediaFiles: [
            "IMG_3709.jpg",
            "IMG_4243.jpg",
            "IMG_4503.jpg",
            "IMG_4554.jpg",
            "IMG_7890.jpg",
            "IMG_7950.jpg",
            "IMG_8199.jpg",
            "IMG_8371.jpg",
            "IMG_8411.jpg",
            "IMG_8414.jpg",
            "IMG_8548.jpg",
            "IMG_8619.jpg",
            "IMG_8670.jpg",
            "IMG_8708.jpg",
            "IMG_8826.jpg",
            "IMG_8835.jpg",
            "IMG_8843.jpg",
            "IMG_8859.jpg",
            "IMG_8895.jpg",
            "IMG_9032.jpg",
            "IMG_9081.jpg",
        ]
    }
]

export const Featured: Category = {
    name: "Featured Sessions",
    path: Paths.Featured,
    category: "Featured",
    featuredHorizontal: FeaturedSession[0].name + '/' + FeaturedSession[0].featuredHorizontal,
    featuredVertical: FeaturedSession[1].name + '/' + FeaturedSession[1].featuredVertical,
    sessions: FeaturedSession
}