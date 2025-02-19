import React from "react";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import { SpecificSession } from "../MediaLibrary/MediaTypes";
export declare const getSession: ({ categoryName, sessionName }: {
    categoryName: keyof typeof mediaLibrary;
    sessionName: string;
}) => SpecificSession;
declare const Masonry: React.FC<{
    sessions?: SpecificSession[];
    title?: string;
}>;
export default Masonry;
