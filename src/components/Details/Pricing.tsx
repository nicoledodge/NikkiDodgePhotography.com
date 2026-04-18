import MediaLibrary from "../MediaLibrary/MediaLibrary";
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";

interface pricingPlan {
    title: string,
    image: string,
    price: number,
    features: string[]
}

const basic: pricingPlan = {
    title: "Essentials",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[2].name + '/' + MediaLibrary.Weddings.sessions[2].featuredHorizontal,
    price: 1500,
    features: [
        "Up to eight hours of wedding day coverage",
        "Professionally edited final gallery",
        "Online delivery with high-resolution downloads",
        "Planning support before the wedding day"
    ]
}

const deluxe: pricingPlan = {
    title: "Signature",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[0].name + '/' + MediaLibrary.Weddings.sessions[0].featuredHorizontal,
    price: 1750,
    features: [
        ...basic.features,
        "One-hour bridal or couples portrait session"
    ]
}
const premium: pricingPlan = {
    title: "Full Story",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[5].name + '/' + MediaLibrary.Weddings.sessions[5].featuredHorizontal,
    price: 2000,
    features: [
        ...deluxe.features,
        "Two-hour engagement session"
    ]
}


const pricingPlans = [
    basic, deluxe, premium
];

const Pricing = () => {
    return (
        <section className="pricing-plans">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>Our Pricing</h6>
                            <h4>
                                Wedding collections that keep the decision <em>simple</em>
                            </h4>
                        </div>
                    </div>
                    {pricingPlans.map((plan, key) => (
                        <div className="col-lg-4" key={key}>
                            <div className="pricing-item">
                                <img src={`${plan.image}`} alt=""/>
                                <h4>{plan.title}</h4>
                                <ul className={`plan-${key}`} style={{
                                    minHeight: "200px"
                                }}>
                                    {plan.features.map((feature, index) => (
                                        <li key={index}>{feature}</li>
                                    ))}
                                </ul>
                                <span className="price">${plan.price} USD</span>
                                <div className="border-button">
                                    <Link to={CONTACT}>Ask About {plan.title}</Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
