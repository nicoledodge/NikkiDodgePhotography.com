import React, { useState } from "react";

const SearchForm: React.FC = () => {
    const [contest, setContest] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        console.log("Searching for:", { contest, category, price });
    };

    return (
        <div className="search-form">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <form id="search-form" name="gs" onSubmit={handleSubmit} role="search">
                            <div className="row">
                                <div className="col-lg-4">
                                    <fieldset>
                                        <label htmlFor="contest" className="form-label">
                                            Search Any Contest
                                        </label>
                                        <input
                                            type="text"
                                            name="contest"
                                            className="searchText"
                                            placeholder="Contest Name..."
                                            autoComplete="on"
                                            required
                                            value={contest}
                                            onChange={(e) => setContest(e.target.value)}
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-4">
                                    <fieldset>
                                        <label htmlFor="category" className="form-label">
                                            Pick Category
                                        </label>
                                        <select
                                            name="category"
                                            className="form-select"
                                            id="category"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                        >
                                            <option value="">Choose a category</option>
                                            <option value="Nature">Nature Photography (220 Contests)</option>
                                            <option value="Portrait">Portrait Photography (172 Contests)</option>
                                            <option value="Space">Space Photography (92 Contests)</option>
                                        </select>
                                    </fieldset>
                                </div>
                                <div className="col-lg-2">
                                    <fieldset>
                                        <label htmlFor="chooseprice" className="form-label">
                                            Award Price
                                        </label>
                                        <select
                                            name="Price"
                                            className="form-select"
                                            id="chooseCategory"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                        >
                                            <option value="">Choose a price</option>
                                            <option value="500">$500 to $1,000</option>
                                            <option value="1500">$1,500 to $2,000</option>
                                            <option value="2500">$2,500 to $3,000</option>
                                            <option value="3500+">$3,500+</option>
                                        </select>
                                    </fieldset>
                                </div>
                                <div className="col-lg-2">
                                    <fieldset>
                                        <button type="submit" className="main-button">
                                            Search Now
                                        </button>
                                    </fieldset>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchForm;
