import React from "react";

const OtherPhotosInCategory: React.FC<{
    mediaFiles: string[];
}> = ({mediaFiles}) => {

    if (!mediaFiles.length) {
        return <p>No photo session found.</p>;
    }

    return (
        <section className="contest-waiting mb-5">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <h5>Other Contests Waiting For You:</h5>
                    </div>

                    {mediaFiles.map((shoot, index) => (
                        <div key={index} className="col-lg-3 col-sm-6">
                            <div className="waiting-item">
                                <img src={shoot} alt={"shoot.title"} />
                                <div className="down-content">
                                    <h4> shoot.title</h4>
                                    <p> shoot.description</p>
                                    <span className="price">Price: <em>shoot.price</em></span>
                                    <span className="deadline">Deadline: <em>shoot.deadline</em></span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    <div className="col-lg-12">
                        <ul className="pagination">
                            <li><a href="#"><i className="fa fa-arrow-left"></i></a></li>
                            <li><a href="#">1</a></li>
                            <li className="active"><a href="#">2</a></li>
                            <li><a href="#">3</a></li>
                            <li><a href="#"><i className="fa fa-arrow-right"></i></a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default OtherPhotosInCategory;
