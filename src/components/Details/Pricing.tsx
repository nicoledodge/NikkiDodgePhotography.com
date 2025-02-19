import MediaLibrary from "../MediaLibrary/MediaLibrary";

interface pricingPlan {
    title: string,
    image: string,
    price: number,
    features: string[]
}

const basic: pricingPlan = {
    title: "The Basic",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[2].name + '/' + MediaLibrary.Weddings.sessions[2].featuredHorizontal,
    price: 1500,
    features: [
        "Access to online gallery including all your photos",
        "Up to eight hours of wedding day coverage",
        "Professionally edited photos",
        "Turnaround aprox 10 weeks"
    ]
}

const deluxe: pricingPlan = {
    title: "The Deluxe",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[0].name + '/' + MediaLibrary.Weddings.sessions[0].featuredHorizontal,
    price: 1750,
    features: [
        ...basic.features,
        "1 Hour Bridal Session"
    ]
}
const premium: pricingPlan = {
    title: "The Premium",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[5].name + '/' + MediaLibrary.Weddings.sessions[5].featuredHorizontal,
    price: 2000,
    features: [
        ...deluxe.features,
        "2 Hour Engagement Session"
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
                                <em>Wedding</em> Packages
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
                                    <a href="#">Choose This Plan</a>
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
