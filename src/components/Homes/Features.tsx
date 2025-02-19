import {Swiper, SwiperSlide} from "swiper/react";
import {Autoplay, Navigation, Pagination} from "swiper/modules";
import MediaLibrary from "../MediaLibrary/MediaLibrary.tsx";
import {shuffleArray} from "../../functions/shuffleArray.tsx";

const featuredItems = shuffleArray(MediaLibrary.Featured.sessions
    .filter(s => s.name === "Horizontal")
    .flatMap((session) =>
        session.mediaFiles.map((image) => ({
            category: MediaLibrary.Featured.category,
            path: MediaLibrary.Featured.path,
            name: session.name,
            mediaFiles: session.mediaFiles,
            image: image
        }))))
    .map((imageObject, index) => (
        <SwiperSlide key={index}>
            <div className="item">
                <div className="thumb">
                    <img src={MediaLibrary.Featured.path + '/' + imageObject.name + '/' + imageObject.image} alt=""/>
                    <div className="hover-effect">
                        <div className="content">
                            <h4>
                                {imageObject.name} <i className="fa fa-star"></i><i className="fa fa-star"></i><i
                                className="fa fa-star"></i><i className="fa fa-star"></i> <span>(4.5)</span>
                            </h4>
                            <ul>
                                <li><span>Contest Winner:</span> {imageObject.image}</li>
                                <li><span>Contest Author:</span> Vincent Adam</li>
                                <li><span>Awards:</span> $1,200 + Canon EOS R10</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </SwiperSlide>));

const Features = () => {
    return (
        <section className="featured-items" id="featured-items">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <Swiper
                            modules={[Navigation, Pagination, Autoplay]}
                            navigation
                            pagination={{clickable: true}}
                            spaceBetween={20}
                            slidesPerView={3}
                            autoplay={{
                                delay: 3000, // ✅ Auto-slide every 3 seconds
                                disableOnInteraction: false, // ✅ Keeps autoplay even after user interaction
                                pauseOnMouseEnter: true, // ✅ Keeps autoplay even after user interaction
                            }}
                            loop
                            breakpoints={{
                                320: {slidesPerView: 1},
                                768: {slidesPerView: 2},
                                1024: {slidesPerView: 3},
                            }}
                        >
                            {featuredItems}
                        </Swiper>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;