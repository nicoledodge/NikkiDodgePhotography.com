import Heading from "../components/Blog/Heading";
import ArticleCard from "../components/Blog/ArticleCard";
import {blogArticles} from "../data/blogArticles";

export const BLOG = '/blog'

export default function Blog() {
    const featuredArticle = blogArticles.find((article) => article.featured) ?? blogArticles[0];
    const rest = blogArticles.filter((article) => article.slug !== featuredArticle?.slug);

    return <>
        <Heading />
        <section className="blog-section py-5">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-10">
                        <p className="blog-section__intro">Stories from the celebrations, families, and creative brands I photograph around the Pacific Northwest and beyond. Browse for venue inspiration, timeline ideas, and practical tips to make your own session feel effortless.</p>
                    </div>
                </div>

                <div className="row g-4 blog-section__grid">
                    {featuredArticle && (
                        <div className="col-12">
                            <ArticleCard article={featuredArticle} featured />
                        </div>
                    )}

                    {rest.map((article) => (
                        <div key={article.slug} className="col-md-6">
                            <ArticleCard article={article} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    </>
}
