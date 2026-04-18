import React from "react";
import {Link} from "react-router-dom";
import MediaLibrary from "../MediaLibrary/MediaLibrary";
import {CONTACT} from "../../pages/Contact";

interface SessionOffer {
    id: number;
    image: string;
    title: string;
    label: string;
    focus: string;
    planning: string;
    delivery: string;
}

const offers: SessionOffer[] = [
    {
        id: 1,
        image: `${MediaLibrary.Graduations.path}/${MediaLibrary.Graduations.sessions[0].name}/${MediaLibrary.Graduations.sessions[0].featuredHorizontal}`,
        title: "Graduation Sessions",
        label: "Portraits",
        focus: "Outfit changes, campus locations, and personality-forward portraits",
        planning: "Prep support",
        delivery: "Custom quote"
    },
    {
        id: 2,
        image: `${MediaLibrary.Family.path}/${MediaLibrary.Family.sessions[0].name}/${MediaLibrary.Family.sessions[0].featuredHorizontal}`,
        title: "Family Sessions",
        label: "Families",
        focus: "Movement-first sessions that leave room for kids to be themselves",
        planning: "Location ideas",
        delivery: "Custom quote"
    },
    {
        id: 3,
        image: `${MediaLibrary.Lifestyles.path}/${MediaLibrary.Lifestyles.sessions[0].name}/${MediaLibrary.Lifestyles.sessions[0].featuredHorizontal}`,
        title: "Headshots & Lifestyle Brands",
        label: "Business",
        focus: "Clean, natural portraits for websites, launches, and social media",
        planning: "Shot planning",
        delivery: "Custom quote"
    },
    {
        id: 4,
        image: `${MediaLibrary.Music.path}/${MediaLibrary.Music.sessions[0].name}/${MediaLibrary.Music.sessions[0].featuredHorizontal}`,
        title: "Artists & Music",
        label: "Creative",
        focus: "Portraits with texture, energy, and room for a strong visual identity",
        planning: "Creative direction",
        delivery: "Custom quote"
    },
];

const ContestWin: React.FC = () => {
    return (
        <section className="contest-win mb-5">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>More Ways To Work Together</h6>
                            <h4>Need something besides a <em>wedding collection</em>?</h4>
                        </div>
                    </div>

                    {offers.map((offer) => (
                        <div key={offer.id} className="col-lg-3">
                            <div className="contest-item">
                                <div className="top-content">
                                    <span className="award">{offer.label}</span>
                                    <span className="price">{offer.delivery}</span>
                                </div>
                                <img src={offer.image} alt={offer.title}/>
                                <h4>{offer.title}</h4>
                                <div className="info">
                                  <span className="participants">
                                    <img src="/assets/images/icon-03.png" alt="Planning"/>
                                    <br/> {offer.planning}
                                  </span>
                                    <span className="submittions">
                                    <img src="/assets/images/icon-01.png" alt="Details"/>
                                    <br/> Personalized fit
                                  </span>
                                </div>
                                <div className="border-button">
                                    <Link to={CONTACT}>Ask About This Session</Link>
                                </div>
                                <span className="info">{offer.focus}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ContestWin;
