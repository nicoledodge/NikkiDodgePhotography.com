import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {Link} from "react-router-dom";
import {GALLERY} from "../../pages/Gallery";


const testimonialsData = [
    {
        text: "I had always adored Nikki’s beautiful style of photographing weddings, so when we got engaged we basically picked our wedding date around Nikki’s availability! She perfectly captured our day and our loved ones, and her photos serve as constant reminders of our happy day. We especially loved how she captured the simple, subtle moments and details like flowers and fabrics to create a story of the day. Nikki is fantastic, warm, and highly professional!",
        name: "Sally & Dan",
        context: "Wedding clients",
        image: "assets/images/author.jpg",
    },
    {
        text: "Nikki is a gifted photographer, artist, and human being. Her depth of experience, creative vision, artistic insight, and eye for compositions are unrivaled. Nikki has a wonderful love affair with light and nature. It is the way she sees the world and how she captures photographs that sets her apart. She doesn’t just capture a shot, she captures an experience. We entrusted Nikki with our special day, and we are so thankful to her for beautifully capturing the heart and soul of our wedding.",
        name: "Ria & Andrew",
        context: "Wedding clients",
        image: "assets/images/author.jpg",
    }
];

const clientGalleryLinks = [
    {
        label: "Family session gallery",
        path: mediaLibrary.Family.path,
        category: mediaLibrary.Family.category,
        image: mediaLibrary.Family.featuredVertical,
    },
    {
        label: "Sports gallery",
        path: mediaLibrary.Sports.path,
        category: mediaLibrary.Sports.category,
        image: mediaLibrary.Sports.featuredVertical,
    },
    {
        label: "Graduation portrait gallery",
        path: mediaLibrary.Graduations.path,
        category: mediaLibrary.Graduations.category,
        image: mediaLibrary.Graduations.featuredVertical,
    },
    {
        label: "Music photography gallery",
        path: mediaLibrary.Music.path,
        category: mediaLibrary.Music.category,
        image: mediaLibrary.Music.featuredVertical,
    },
    {
        label: "Engagement session gallery",
        path: mediaLibrary.Engagements.path,
        category: mediaLibrary.Engagements.category,
        image: mediaLibrary.Engagements.featuredVertical,
    },
    {
        label: "Lifestyle photography gallery",
        path: mediaLibrary.Lifestyles.path,
        category: mediaLibrary.Lifestyles.category,
        image: mediaLibrary.Lifestyles.featuredVertical,
    },
];

const Testimonials: React.FC = () => {
    return (
        <section className="testimonials" aria-labelledby="testimonials-title">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <p className="section-eyebrow">Kind Words</p>
                            <h2 id="testimonials-title">What clients remember after the gallery is delivered</h2>
                        </div>
                    </div>

                    {/* Swiper Carousel */}
                    <div className="col-lg-8 offset-lg-2">
                        <Swiper
                            modules={[Navigation, Pagination]}
                            spaceBetween={20}
                            slidesPerView={1}
                            navigation
                            pagination={{ clickable: true }}
                            loop={testimonialsData.length > 2}
                        >
                            {testimonialsData.map((testimonial, index) => (
                                <SwiperSlide key={index}>
                                    <div className="item">
                                        <div className="content">
                                            <div className="left-content">
                                                <p>{testimonial.text}</p>
                                                <h3>{testimonial.name}</h3>
                                                <span>{testimonial.context}</span>
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

                    {/* Gallery preview links */}
                    <div className="col-lg-12 mt-5">
                        <div className="clients">
                            <div className="row">
                                {clientGalleryLinks.map((gallery) => (
                                    <div className="col-lg-2 col-4" key={gallery.label}>
                                        <Link
                                            to={`${GALLERY}/${gallery.category}/${gallery.image.split('/')[0]}`}
                                            aria-label={`Open ${gallery.label}`}
                                        >
                                            <img
                                                src={`${gallery.path}/${gallery.image}`}
                                                alt={`${gallery.label} preview`}
                                            />
                                        </Link>
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
