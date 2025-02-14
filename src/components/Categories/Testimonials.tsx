import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

const testimonialsData = [
    {
        text: "SnapX Photography is a professional website template for photo and video related businesses. This Bootstrap v5.1.3 HTML CSS template is provided by TemplateMo website.",
        name: "Thomas Wilson",
        userId: "User #007704",
        image: "assets/images/author.jpg",
    },
    {
        text: "You may visit Too CSS website for latest collections of great templates. There are a variety of different categories for HTML CSS templates.",
        name: "John Walker",
        userId: "User #007772",
        image: "assets/images/author.jpg",
    },
    {
        text: "If you need a working contact form, please visit TemplateMo contact page for more information. You can easily buy and use a simple PHP contact form.",
        name: "Vincent Anthon",
        userId: "User #007794",
        image: "assets/images/author.jpg",
    },
    {
        text: "When you need Free CSS Templates, you just remember our website TemplateMo. We provide you best quality website templates at absolutely free of charge. No hidden cost involved.",
        name: "Alan Smithee",
        userId: "User #007765",
        image: "assets/images/author.jpg",
    },
    {
        text: "We hope this template is very useful for your website development. If you wish to support TemplateMo, you may make a small amount of donation via PayPal.",
        name: "Alan Smithee",
        userId: "User #007724",
        image: "assets/images/author.jpg",
    },
];

const clientLogos = [
    "assets/images/contest-01.jpg",
    "assets/images/contest-02.jpg",
    "assets/images/contest-01.jpg",
    "assets/images/contest-02.jpg",
    "assets/images/contest-01.jpg",
    "assets/images/contest-02.jpg",
];

const Testimonials: React.FC = () => {
    return (
        <section className="testimonials">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>What Clients Say</h6>
                            <h4>What <em>Website</em> Users Are Saying <em>Topics</em></h4>
                        </div>
                    </div>

                    {/* Swiper Carousel */}
                    <div className="col-lg-8 offset-lg-2">
                        <Swiper
                            modules={[Navigation, Pagination, Autoplay]}
                            spaceBetween={20}
                            slidesPerView={1}
                            navigation
                            pagination={{ clickable: true }}
                            autoplay={{ delay: 5000, disableOnInteraction: false }}
                            loop
                        >
                            {testimonialsData.map((testimonial, index) => (
                                <SwiperSlide key={index}>
                                    <div className="item">
                                        <div className="content">
                                            <div className="left-content">
                                                <p>{testimonial.text}</p>
                                                <h4>{testimonial.name}</h4>
                                                <span>{testimonial.userId}</span>
                                            </div>
                                            <div className="image">
                                                <img src={testimonial.image} alt={testimonial.name} />
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                    {/* Client Logos Section */}
                    <div className="col-lg-12 mt-5">
                        <div className="clients">
                            <div className="row">
                                {clientLogos.map((logo, index) => (
                                    <div className="col-lg-2 col-4" key={index}>
                                        <img src={logo} alt="Client Logo" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
