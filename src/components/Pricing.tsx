const pricingPlans = [
    {
        id: 1,
        title: "Basic Plan",
        image: "pricing-01.jpg",
        price: "$25 USD",
        features: [
            "Lorem Ipsum Dolores Sonte",
            "Songe Lorem Ipsum Dol",
            "Matrios Venga Heptuss",
            "Denim Sriracha Kogi",
            "Digital Photography Awards",
        ],
    },
    {
        id: 2,
        title: "Standard Plan",
        image: "pricing-02.jpg",
        price: "$45 USD",
        features: [
            "Lorem Ipsum Dolores Sonte",
            "Songe Lorem Ipsum Dol",
            "Matrios Venga Heptuss",
            "Denim Sriracha Kogi",
            "Digital Photography Awards",
        ],
    },
    {
        id: 3,
        title: "Advanced Plan",
        image: "pricing-03.jpg",
        price: "$85 USD",
        features: [
            "Lorem Ipsum Dolores Sonte",
            "Songe Lorem Ipsum Dol",
            "Matrios Venga Heptuss",
            "Denim Sriracha Kogi",
            "Digital Photography Awards",
        ],
    },
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
                                Photography <em>Contest Plans</em> and Price <em>Awards</em>
                            </h4>
                        </div>
                    </div>
                    {pricingPlans.map((plan) => (
                        <div className="col-lg-4" key={plan.id}>
                            <div className="pricing-item">
                                <img src={`/assets/images/${plan.image}`} alt="" />
                                <h4>{plan.title}</h4>
                                <ul className={`plan-${plan.id}`}>
                                    {plan.features.map((feature, index) => (
                                        <li key={index}>{feature}</li>
                                    ))}
                                </ul>
                                <span className="price">{plan.price}</span>
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
