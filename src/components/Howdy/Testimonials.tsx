import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {Link} from "react-router-dom";
import {GALLERY} from "../../pages/Gallery";


const testimonialsData = [
    {
        text: "I had always adored Nikki’s beautiful style of photographing weddings, so when we got engaged we basically picked our wedding date around Nikki’s availability! She perfectly captured our day and our loved ones, and her photos serve as constant reminders of our happy day. We especially loved how she captured the simple, subtle moments and details like flowers and fabrics to create a story of the day. Nikki is fantastic, warm, and highly professional!",
        name: "Sally & Dan",
        userId: "User #007704",
        image: "assets/images/author.jpg",
    },
    {
        text: "Nikki is a gifted photographer, artist, and human being. Her depth of experience, creative vision, artistic insight, and eye for compositions are unrivaled. Nikki has a wonderful love affair with light and nature. It is the way she sees the world and how she captures photographs that sets her apart. She doesn’t just capture a shot, she captures an experience. We entrusted Nikki with our special day, and we are so thankful to her for beautifully capturing the heart and soul of our wedding.",
        name: "Ria & Andrew",
        userId: "User #007772",
        image: "assets/images/author.jpg",
    }
];

const clientLogos = [
    <Link to={GALLERY + '/' + mediaLibrary.Family.category + '/' + mediaLibrary.Family.featuredVertical.split('/')[0]}>
        <img src={mediaLibrary.Family.path + '/' + mediaLibrary.Family.featuredVertical} alt="Client Logo"/>
    </Link>,
    <Link to={GALLERY + '/' + mediaLibrary.Sports.category + '/' + mediaLibrary.Sports.featuredVertical.split('/')[0]}>
        <img src={mediaLibrary.Sports.path + '/' + mediaLibrary.Sports.featuredVertical} alt="Client Logo"/>
    </Link>,
    <Link to={GALLERY + '/' + mediaLibrary.Graduations.category + '/' + mediaLibrary.Graduations.featuredVertical.split('/')[0]}>
        <img src={mediaLibrary.Graduations.path + '/' + mediaLibrary.Graduations.featuredVertical} alt="Client Logo"/>
    </Link>,
    <Link to={GALLERY + '/' + mediaLibrary.Music.category + '/' + mediaLibrary.Music.featuredVertical.split('/')[0]}>
        <img src={mediaLibrary.Music.path + '/' + mediaLibrary.Music.featuredVertical} alt="Client Logo"/>
    </Link>,
    <Link to={GALLERY + '/' + mediaLibrary.Engagements.category + '/' + mediaLibrary.Engagements.featuredVertical.split('/')[0]}>
        <img src={mediaLibrary.Engagements.path + '/' + mediaLibrary.Engagements.featuredVertical} alt="Client Logo"/>
    </Link>,
    <Link to={GALLERY + '/' + mediaLibrary.Lifestyles.category + '/' + mediaLibrary.Lifestyles.featuredVertical.split('/')[0]}>
        <img src={mediaLibrary.Lifestyles.path + '/' + mediaLibrary.Lifestyles.featuredVertical} alt="Client Logo"/>
    </Link>
];

const Testimonials: React.FC = () => {
    return (
        <section className="testimonials">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>Testimonials</h6>
                            <h4>What <em>My Clients</em> Are <em>Saying</em></h4>
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
                                        {logo}
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
