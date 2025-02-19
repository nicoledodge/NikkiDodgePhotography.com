import { Paths } from "./MediaTypes";
const RepresentativesSessions = [
    {
        name: "VPHarris",
        featuredHorizontal: "_Z2A7080.JPG",
        featuredVertical: "_Z2A7078.JPG",
        mediaFiles: [
            "_Z2A7067.JPG",
            "_Z2A7078.JPG",
            "_Z2A7080.JPG",
            "_Z2A7092.JPG",
        ]
    }
];
export const Representatives = {
    name: "Representatives",
    path: Paths.Representatives,
    category: "Representatives",
    featuredHorizontal: RepresentativesSessions[0].name + '/' + RepresentativesSessions[0].featuredHorizontal,
    featuredVertical: RepresentativesSessions[0].name + '/' + RepresentativesSessions[0].featuredVertical,
    sessions: RepresentativesSessions
};
