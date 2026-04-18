
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";

export default function About() {
    return <div className="container">
        <div className="row">
            <div className="col-lg-10 offset-lg-1">
                <div className="header-text mt-5">
                    <h1>
                        A <em>guided</em> experience with room for real <em>emotion</em>
                    </h1>
                    <br/>
                    <p className="h5">
                        Nikki Dodge Photography is built for clients who want beautiful images without feeling like
                        they are performing all day. From wedding timelines and engagement locations to senior outfit
                        changes and family pacing, the process stays simple, communicative, and centered on the people
                        in front of the camera.
                    </p>
                    <div className="main-button mt-4">
                        <Link to={CONTACT}>Ask About Availability</Link>
                    </div>
                </div>
            </div>
        </div>
    </div>

}
