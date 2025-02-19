import {Category, Paths, Session} from "./MediaTypes";

const FamilySessions: Session[] = [
    {
        name: "Hackfield",
        featuredHorizontal: "_Z2A0003.jpg",
        featuredVertical: "_Z2A0087.jpg",
        mediaFiles: [
            "_Z2A0018.jpg",
            "_Z2A0001.jpg",
            "_Z2A0003.jpg",
            "_Z2A0028.jpg",
            "_Z2A0067.jpg",
            "_Z2A0087.jpg",
            "_Z2A0101.jpg",
            "_Z2A0116.jpg",
            "_Z2A0150.jpg",
            "_Z2A0163.jpg",
            "_Z2A0194.jpg",
            "_Z2A0216.jpg",
            "_Z2A0220.jpg",
            "_Z2A0230.jpg",
            "_Z2A0241.jpg",
            "_Z2A0268.jpg",
            "_Z2A0282.jpg",
            "_Z2A0391.jpg",
            "_Z2A0418.jpg",
            "_Z2A0512.jpg",
            "_Z2A0562.jpg",
            "_Z2A0621.jpg",
            "_Z2A0627.jpg",
            "_Z2A0702.jpg",
            "_Z2A0733.jpg",
            "_Z2A0821.jpg",
            "_Z2A0860.jpg",
            "_Z2A0911.jpg",
            "_Z2A1005.jpg",
            "_Z2A1072.jpg",
            "_Z2A1084.jpg",
            "_Z2A1123.jpg",
            "_Z2A1141.jpg",
            "_Z2A9957.jpg"
        ]
    }
]

export const Family: Category = {
    name: "Family Sessions",
    path: Paths.Family,
    category: "Family",
    featuredHorizontal: FamilySessions[0].name + '/' + FamilySessions[0].featuredHorizontal,
    featuredVertical: FamilySessions[0].name + '/' + FamilySessions[0].featuredVertical,
    sessions: FamilySessions
}