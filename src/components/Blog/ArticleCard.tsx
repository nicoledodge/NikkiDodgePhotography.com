import type {BlogArticle} from "../../data/blogArticles";

interface ArticleCardProps {
    article: BlogArticle;
    featured?: boolean;
}

const ArticleCard = ({article, featured}: ArticleCardProps) => {
    return (
        <article className={`blog-article-card${featured ? " blog-article-card--featured" : ""}`}>
            <div className="blog-article-card__image">
                <img src={article.heroImage} alt={article.title} loading={featured ? "eager" : "lazy"} />
            </div>
            <div className="blog-article-card__content">
                <div className="blog-article-card__meta">
                    <span>{article.publishedAt}</span>
                    <span aria-hidden="true">•</span>
                    <span>{article.location}</span>
                    <span aria-hidden="true">•</span>
                    <span>{article.readTime}</span>
                </div>
                <h3>{article.title}</h3>
                <p className="blog-article-card__excerpt">{article.excerpt}</p>
                {article.highlights.length > 0 && (
                    <ul className="blog-article-card__highlights">
                        {article.highlights.map((highlight) => (
                            <li key={highlight}>{highlight}</li>
                        ))}
                    </ul>
                )}
                <div className="blog-article-card__tags">
                    {article.tags.map((tag) => (
                        <span key={tag} className="blog-article-card__tag">{tag}</span>
                    ))}
                </div>
            </div>
        </article>
    );
};

export default ArticleCard;
