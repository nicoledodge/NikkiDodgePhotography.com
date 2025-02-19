import type { Search } from "./SearchForm.types";
export declare const Sessions: {
    mediaFiles: string[];
    name: string;
    featuredHorizontal: string;
    featuredVertical: string;
    path: string;
    category: import("../MediaLibrary/MediaTypes").Categories;
    sessions: import("../MediaLibrary/MediaTypes").Session[];
}[];
declare const SessionExplorer: ({ categorySearch, sessionSearch }: Search) => import("react/jsx-runtime").JSX.Element;
export default SessionExplorer;
