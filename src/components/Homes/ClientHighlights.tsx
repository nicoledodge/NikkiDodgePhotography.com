import {Swiper, SwiperSlide} from "swiper/react";
import {Navigation, Pagination} from "swiper/modules";
import {Link} from "react-router-dom";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {CONTACT} from "../../pages/Contact";
import {PRICING} from "../../pages/Pricing";

const featuredSessions = [
    {
        id: 1,
        image: mediaLibrary.Music.path + '/' + mediaLibrary.Music.sessions[0].name + '/' + mediaLibrary.Music.sessions[0].featuredHorizontal,
        label: "Music",
        focus: "Concert and artist coverage",
        detail: "Fast-moving light, crowds, and backstage context",
        support: "Shot-list planning",
        delivery: "Web and social-ready favorites"
    },
    {
        id: 2,
        image: mediaLibrary.Sports.path + '/' + mediaLibrary.Sports.sessions[0].name + '/' + mediaLibrary.Sports.sessions[0].featuredHorizontal,
        label: "Sports",
        focus: "Athlete and team stories",
        detail: "Action, portraits, and personality in one gallery",
        support: "Schedule guidance",
        delivery: "Family and media-use images"
    },
    {
        id: 3,
        image: mediaLibrary.Graduations.path + '/' + mediaLibrary.Graduations.sessions[0].name + '/' + mediaLibrary.Graduations.sessions[0].featuredHorizontal,
        label: "Graduates",
        focus: "Senior portraits with range",
        detail: "Outfits, locations, and personality without rushing",
        support: "Prep support",
        delivery: "Print and announcement-ready files"
    },
    {
        id: 4,
        image: mediaLibrary.Lifestyles.path + '/' + mediaLibrary.Lifestyles.sessions[0].name + '/' + mediaLibrary.Lifestyles.sessions[0].featuredHorizontal,
        label: "Lifestyle",
        focus: "Creative personal stories",
        detail: "Editorial-feeling images with room for real life",
        support: "Creative direction",
        delivery: "Brand and social-use galleries"
    }
];

const ClientHighlights = () => {
    return (
        <section className="client-highlights">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <p className="section-eyebrow" style={{
                                color: "var(--fourth-color)"
                            }}>Ways To Make The Work Work Harder</p>
                            <h2 style={{
                                color: "var(--fourth-color)"
                            }}>
                                Concerts, athletes, graduates, brands, families, and weddings can each have their own <em>pace</em>
                            </h2>
                        </div>
                    </div>
                    <div className="col-lg-12">
                        <Swiper
                            modules={[Navigation, Pagination]}
                            navigation
                            pagination={{clickable: true}}
                            spaceBetween={20}
                            slidesPerView={3}
                            loop={featuredSessions.length > 3}
                            breakpoints={{
                                320: {slidesPerView: 1},
                                768: {slidesPerView: 2},
                                1024: {slidesPerView: 3},
                            }}
                        >
                            {featuredSessions.map((session) => (
                                <SwiperSlide key={session.id}>
                                    <div className="closed-item">
                                        <div className="thumb">
                                            <img src={session.image} alt={session.focus}/>
                                            <span className="session-label">
                                                <em>Session:</em> {session.label}
                                            </span>
                                            <span className="session-detail">
                                                <em>Experience:</em> {session.detail}
                                            </span>
                                        </div>
                                        <div className="down-content">
                                            <div className="row">
                                                <div className="col-7">
                                                    <h3>
                                                        {session.focus} <br/>
                                                        <span>{session.support}</span>
                                                    </h3>
                                                </div>
                                                <div className="col-5">
                                                    <h3 className="pics">
                                                        Client Delivery <br/>
                                                        <span>{session.delivery}</span>
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                    <div className="col-lg-12 mt-5">
                        <div className="main-button text-center">
                            <Link to={PRICING}>See Pricing And Collections</Link>
                        </div>
                        <div className="main-button text-center mt-3">
                            <Link to={CONTACT}>Start Your Inquiry</Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ClientHighlights;
