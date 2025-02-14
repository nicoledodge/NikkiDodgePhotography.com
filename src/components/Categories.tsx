const Categories = () => {
    return (
        <section className="popular-categories">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-6">
                        <div className="section-heading">
                            <h6>Our Categories</h6>
                            <h4>Check Out <em>Popular</em> Contest <em>Categories</em></h4>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="main-button">
                            <a href="categories.html">Discover All Categories</a>
                        </div>
                    </div>
                    {[
                        { id: 1, title: "Nature Pic Contest", contests: 126, icon: "icon-01.png", image: "popular-01.png" },
                        { id: 2, title: "Random Pic Contest", contests: 116, icon: "icon-02.png", image: "popular-02.png" },
                        { id: 3, title: "Portrait Pic Contest", contests: 164, icon: "icon-03.png", image: "popular-03.png" },
                        { id: 4, title: "Space Pic Contest", contests: 135, icon: "icon-04.png", image: "popular-04.png" }
                    ].map((category) => (
                        <div className="col-lg-3 col-sm-6" key={category.id}>
                            <div className="popular-item">
                                <div className="top-content">
                                    <div className="icon">
                                        <img src={`/assets/images/${category.icon}`} alt="" />
                                    </div>
                                    <div className="right">
                                        <h4>{category.title}</h4>
                                        <span><em>{category.contests}</em> Available Contests</span>
                                    </div>
                                </div>
                                <div className="thumb">
                                    <img src={`/assets/images/${category.image}`} alt="" />
                                    <span className="category">Top Contest</span>
                                    <span className="likes"><i className="fa fa-heart"></i> 256</span>
                                </div>
                                <div className="border-button">
                                    <a href="contest-details.html">Browse {category.title} Contests</a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Categories;