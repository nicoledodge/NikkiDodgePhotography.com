import {Swiper, SwiperSlide} from "swiper/react";
import {Navigation, Pagination} from "swiper/modules";
import {Link} from "react-router-dom";
import MediaLibrary from "../MediaLibrary/MediaLibrary";
import {PORTFOLIO} from "../../pages/Portfolio";

const featuredStories = [
    {
        title: "Music coverage that feels close to the stage",
        image: `${MediaLibrary.Music.path}/${MediaLibrary.Music.sessions[0].name}/${MediaLibrary.Music.sessions[0].featuredHorizontal}`,
        destination: `${PORTFOLIO}/${MediaLibrary.Music.category}`,
        details: [
            "Crowd energy, artist portraits, and venue atmosphere",
            "Fast-moving coverage without flattening the color",
            "Images that can support socials, press, and promo"
        ]
    },
    {
        title: "Sports sessions with motion and personality",
        image: `${MediaLibrary.Sports.path}/${MediaLibrary.Sports.sessions[0].name}/${MediaLibrary.Sports.sessions[0].featuredHorizontal}`,
        destination: `${PORTFOLIO}/${MediaLibrary.Sports.category}`,
        details: [
            "Action frames, athlete portraits, and team details",
            "Built for banners, announcements, and family keepsakes",
            "Direction that keeps the session moving"
        ]
    },
    {
        title: "Senior portraits with actual personality",
        image: `${MediaLibrary.Graduations.path}/${MediaLibrary.Graduations.sessions[0].name}/${MediaLibrary.Graduations.sessions[0].featuredHorizontal}`,
        destination: `${PORTFOLIO}/${MediaLibrary.Graduations.category}`,
        details: [
            "Outfit changes without rushing the session",
            "A mix of editorial and approachable frames",
            "Portraits parents love and graduates still feel like themselves in"
        ]
    },
    {
        title: "Wedding coverage with room to breathe",
        image: `${MediaLibrary.Weddings.path}/${MediaLibrary.Weddings.sessions[0].name}/${MediaLibrary.Weddings.sessions[0].featuredHorizontal}`,
        destination: `${PORTFOLIO}/${MediaLibrary.Weddings.category}`,
        details: [
            "Timeline guidance that protects the best light",
            "Prompting that keeps portraits natural",
            "Candid coverage that still catches the details"
        ]
    }
];

const Features = () => {
    return (
        <section className="featured-items" id="featured-items" aria-labelledby="featured-items-title">
            <div className="container">
                <h2 className="sr-only" id="featured-items-title">Featured photography services</h2>
                <div className="row">
                    <div className="col-lg-12">
                        <Swiper
                            modules={[Navigation, Pagination]}
                            navigation
                            pagination={{clickable: true}}
                            spaceBetween={20}
                            slidesPerView={3}
                            loop={featuredStories.length > 4}
                            breakpoints={{
                                320: {slidesPerView: 1},
                                768: {slidesPerView: 2},
                                1024: {slidesPerView: 3},
                            }}
                        >
                            {featuredStories.map((story) => (
                                <SwiperSlide key={story.title}>
                                    <div className="item">
                                        <Link
                                            className="featured-story-card"
                                            to={story.destination}
                                            aria-label={`${story.title}. ${story.details.join(". ")}`}
                                        >
                                            <div className="thumb">
                                                <img src={story.image} alt=""/>
                                                <div className="hover-effect">
                                                    <div className="content">
                                                        <h3>{story.title}</h3>
                                                        <ul>
                                                            {story.details.map((detail) => (
                                                                <li key={detail}>{detail}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;
