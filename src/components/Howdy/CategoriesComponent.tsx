import React from "react";
import {Categories} from "../MediaLibrary/MediaTypes";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {Link} from "react-router-dom";
import {PORTFOLIO} from "../../pages/Portfolio";

const categories: {
    imgSrc: string;
    category: Categories;
    shoots: number;
    icon: string;
}[] = [
    {
        imgSrc: mediaLibrary.Weddings.path + '/' + mediaLibrary.Weddings.featuredHorizontal,
        category: mediaLibrary.Weddings.category,
        shoots: mediaLibrary.Weddings.sessions.length,
        icon: "fa-ring"
    },
    {
        imgSrc: mediaLibrary.Family.path + '/' + mediaLibrary.Family.featuredHorizontal,
        category: mediaLibrary.Family.category,
        shoots: mediaLibrary.Family.sessions.length,
        icon: "fa-people-roof"
    },
    {
        imgSrc: mediaLibrary.Music.path + '/' + mediaLibrary.Music.featuredHorizontal,
        category: mediaLibrary.Music.category,
        shoots: mediaLibrary.Music.sessions.length,
        icon: "fa-icons"
    },
    {
        imgSrc: mediaLibrary.Graduations.path + '/' + mediaLibrary.Graduations.featuredHorizontal,
        category: mediaLibrary.Graduations.category,
        shoots: mediaLibrary.Graduations.sessions.length,
        icon: "fa-graduation-cap"
    },
    {
        imgSrc: mediaLibrary.Sports.path + '/' + mediaLibrary.Sports.featuredHorizontal,
        category: mediaLibrary.Sports.category,
        shoots: mediaLibrary.Sports.sessions.length,
        icon: "fa-volleyball"
    },
];

const CategoriesComponent: React.FC = () => {
    return (
        <div className="top-categories">
            <div className="container">
                <div className="row">
                    {categories.map((category, index) => (
                        <div className="col-lg col-sm-4" key={index}>
                            <Link to={PORTFOLIO + '/' + category.category}>
                                <div className="item">
                                    <div className="icon">
                                        <i className={`fa-solid ${category.icon} fa-3x  mt-2`}></i>
                                    </div>
                                    <h4>{category.category}</h4>
                                    <span>Photoshoots</span>
                                    <span className="counter">{category.shoots}</span>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoriesComponent;
