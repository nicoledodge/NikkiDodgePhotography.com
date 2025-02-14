import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

const closedContests = [
    { id: 1, image: "closed-01.jpg", winner: "Anthony Soft", award: "$1,600", participants: 88, pictures: 320 },
    { id: 2, image: "closed-02.jpg", winner: "Anthony Soft", award: "$4,200", participants: 96, pictures: 410 },
    { id: 3, image: "closed-03.jpg", winner: "Anthony Soft", award: "$3,200", participants: 74, pictures: 284 }
];

const Contests = () => {
    return (
        <section className="closed-contests">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>Closed Photography Contests</h6>
                            <h4>
                                <em>Previous Contests</em> With Handpicked <em>Winners</em>
                            </h4>
                        </div>
                    </div>
                    <div className="col-lg-12">
                        <Swiper
                            modules={[Navigation, Pagination]}
                            navigation
                            pagination={{ clickable: true }}
                            spaceBetween={20}
                            slidesPerView={3}
                            loop
                            breakpoints={{
                                320: { slidesPerView: 1 },
                                768: { slidesPerView: 2 },
                                1024: { slidesPerView: 3 },
                            }}
                        >
                            {closedContests.map((contest) => (
                                <SwiperSlide key={contest.id}>
                                    <div className="closed-item">
                                        <div className="thumb">
                                            <img src={`/assets/images/${contest.image}`} alt="" />
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
                                                        {contest.participants} Participants <br />
                                                        <span>Number Of Artists</span>
                                                    </h4>
                                                </div>
                                                <div className="col-5">
                                                    <h4 className="pics">
                                                        {contest.pictures} Pictures <br />
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
                    <div className="col-lg-12">
                        <div className="border-button text-center">
                            <a href="contests.html">Browse Open Contests</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contests;
