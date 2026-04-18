import {Swiper, SwiperSlide} from "swiper/react";
import {Navigation, Pagination} from "swiper/modules";
import {Link} from "react-router-dom";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {CONTACT} from "../../pages/Contact";
import {PRICING} from "../../pages/Pricing";

const featuredSessions = [
    {
        id: 1,
        image: mediaLibrary.Family.path + '/' + mediaLibrary.Family.sessions[0].name + '/' + mediaLibrary.Family.sessions[0].featuredHorizontal,
        label: "Families",
        focus: "Connection-first sessions",
        detail: "Helpful pacing for kids and room to move",
        support: "Planning support",
        delivery: "Online gallery delivery"
    },
    {
        id: 2,
        image: mediaLibrary.Weddings.path + '/' + mediaLibrary.Weddings.sessions[3].name + '/'+ mediaLibrary.Weddings.sessions[3].featuredHorizontal,
        label: "Weddings",
        focus: "Full-story wedding coverage",
        detail: "From getting ready through the dance floor",
        support: "Timeline guidance",
        delivery: "Print-ready high-resolution files"
    },
    {
        id: 3,
        image: mediaLibrary.Engagements.path + '/' + mediaLibrary.Engagements.sessions[0].name + '/' + mediaLibrary.Engagements.sessions[0].featuredHorizontal,
        label: "Couples",
        focus: "Engagements and anniversaries",
        detail: "A mix of movement, direction, and genuine reactions",
        support: "Location ideas",
        delivery: "Save-the-date ready favorites"
    }
];

const Contests = () => {
    return (
        <section className="closed-contests">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6 style={{
                                color: "var(--fourth-color)"
                            }}>Why clients keep reaching out</h6>
                            <h4 style={{
                                color: "var(--fourth-color)"
                            }}>
                                Clear communication, beautiful light, and galleries that still feel like <em>you</em>
                            </h4>
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
                                            <span className="winner">
                                                <em>Session:</em> {session.label}
                                            </span>
                                            <span className="price">
                                                <em>Outcome:</em> {session.detail}
                                            </span>
                                        </div>
                                        <div className="down-content">
                                            <div className="row">
                                                <div className="col-7">
                                                    <h4>
                                                        {session.focus} <br/>
                                                        <span>{session.support}</span>
                                                    </h4>
                                                </div>
                                                <div className="col-5">
                                                    <h4 className="pics">
                                                        Client Delivery <br/>
                                                        <span>{session.delivery}</span>
                                                    </h4>
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

export default Contests;
