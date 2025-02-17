import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

const featuredItems = [
    { id: 1, title: "Walk In The Nature", image: "featured-01.jpg", winner: "Vincent Adam", author: "Anthony Soft", award: "$1,000 + Camera Nikon" },
    { id: 2, title: "Smile In The Nature", image: "featured-02.jpg", winner: "Thomas Eddy", author: "Anthony Soft", award: "$1,200 + Canon EOS R7" },
    { id: 3, title: "Happy In The Nature", image: "featured-03.jpg", winner: "Vincent Adam", author: "Anthony Soft", award: "$1,800 + Canon EOS R6" },
    { id: 4, title: "Run In The Nature", image: "featured-02.jpg", winner: "Vincent Adam", author: "Anthony Soft", award: "$5,500 + Canon EOS R3" },
    { id: 5, title: "Stay In The Nature", image: "featured-03.jpg", winner: "Thomas Eddy", author: "Anthony Soft", award: "$4,400 + Canon EOS R5" },
    { id: 6, title: "Shoot In The Nature", image: "featured-02.jpg", winner: "Vincent Adam", author: "Anthony Soft", award: "$2,400 + Canon EOS R7" },
    { id: 7, title: "Fly In The Nature", image: "featured-03.jpg", winner: "Vincent Adam", author: "Anthony Soft", award: "$1,200 + Canon EOS R10" }
];

const Features = () => {
    return (
        <section className="featured-items" id="featured-items">
            <div className="container">
                <div className="row">
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
                            {featuredItems.map((item) => (
                                <SwiperSlide key={item.id}>
                                    <div className="item">
                                        <div className="thumb">
                                            <img src={`/assets/images/${item.image}`} alt="" />
                                            <div className="hover-effect">
                                                <div className="content">
                                                    <h4>
                                                        {item.title} <i className="fa fa-star"></i><i className="fa fa-star"></i><i className="fa fa-star"></i><i className="fa fa-star"></i> <span>(4.5)</span>
                                                    </h4>
                                                    <ul>
                                                        <li><span>Contest Winner:</span> {item.winner}</li>
                                                        <li><span>Contest Author:</span> {item.author}</li>
                                                        <li><span>Awards:</span> {item.award}</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
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