import {Swiper, SwiperSlide} from "swiper/react";
import {Navigation, Pagination} from "swiper/modules";
import mediaLibrary from "../MediaLibrary/MediaLibrary";

const closedContests = [
    {
        id: 1,
        image: mediaLibrary.Family.path + '/' + mediaLibrary.Family.sessions[0].name + '/' + mediaLibrary.Family.sessions[0].featuredHorizontal,
        winner: "Anthony Soft",
        award: "$1,600",
        participants: 88,
        pictures: 320
    },
    {
        id: 2,
        image: mediaLibrary.Weddings.path + '/' + mediaLibrary.Weddings.sessions[3].name + '/'+ mediaLibrary.Weddings.sessions[3].featuredHorizontal,
        winner: "Anthony Soft",
        award: "$4,200",
        participants: 96,
        pictures: 410
    },
    {
        id: 3,
        image: mediaLibrary.Engagements.path + '/' + mediaLibrary.Engagements.sessions[0].name + '/' + mediaLibrary.Engagements.sessions[0].featuredHorizontal,
        winner: "Anthony Soft",
        award: "$3,200",
        participants: 74,
        pictures: 284
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
                            }}>Some of Our Favorite Sessions</h6>
                            <h4 style={{
                                color: "var(--fourth-color)"
                            }}>
                                Handpicked <em>Goodness</em> That Makes Us <em>Smile</em>
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
                            loop
                            breakpoints={{
                                320: {slidesPerView: 1},
                                768: {slidesPerView: 2},
                                1024: {slidesPerView: 3},
                            }}
                        >
                            {closedContests.map((contest) => (
                                <SwiperSlide key={contest.id}>
                                    <div className="closed-item">
                                        <div className="thumb">
                                            <img src={contest.image} alt=""/>
                                            <span className="winner">
                                                <em>Winner:</em> {contest.winner}
                                            </span>
                                            <span className="price">
                                                <em>Award :</em> {contest.award}
                                            </span>
                                        </div>
                                        <div className="down-content">
                                            <div className="row">
                                                <div className="col-7">
                                                    <h4>
                                                        {contest.participants} Participants <br/>
                                                        <span>Number Of Artists</span>
                                                    </h4>
                                                </div>
                                                <div className="col-5">
                                                    <h4 className="pics">
                                                        {contest.pictures} Pictures <br/>
                                                        <span>Submitted Pics</span>
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
                            <a href="contests.html">Browse Open Contests</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contests;
