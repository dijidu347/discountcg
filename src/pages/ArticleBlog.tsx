// `/blog/<slug>` : un article.
//
// La liste des sources est en bas de chaque article, et elle n'est pas
// décorative : c'est elle qui distingue ce blog de ceux du secteur, où la
// même erreur se recopie de site en site.

import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight, ArrowLeft, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  articleParSlug, ARTICLES_TRIES, COULEURS_CATEGORIE, dateEnFrancais,
} from "@/data/articles";

const BASE = "https://discountcartegrise.fr";

export default function ArticleBlog() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articleParSlug(slug) : undefined;

  if (!article) return <Navigate to="/blog" replace />;

  const autres = ARTICLES_TRIES.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        {/* Sans le suffixe de marque, comme le pré-rendu : il coûte 23
            caractères, et un article vise quelqu'un qui cherche son sujet, pas
            un prestataire. Les deux doivent dire la même chose — sinon React
            rétablit le suffixe à l'affichage et Google le voit quand même. */}
        <title>{article.titre}</title>
        <meta name="description" content={article.chapo} />
        <link rel="canonical" href={`${BASE}/blog/${article.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: article.titre,
            description: article.chapo,
            datePublished: article.date,
            image: `${BASE}${article.image}`,
            mainEntityOfPage: `${BASE}/blog/${article.slug}`,
            publisher: { "@type": "Organization", name: "Discount Carte Grise" },
          })}
        </script>
      </Helmet>
      <Navbar />

      <nav aria-label="Fil d'Ariane" className="border-b border-border bg-muted/30 pt-20">
        <div className="container mx-auto flex flex-wrap items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/blog" className="hover:text-primary">Le blog</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{article.titre}</span>
        </div>
      </nav>

      <article className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <time dateTime={article.date}>{dateEnFrancais(article.date)}</time>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                COULEURS_CATEGORIE[article.categorie] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {article.categorie}
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
            {article.titre}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{article.chapo}</p>

          <img
            src={article.image}
            alt=""
            className="mt-8 aspect-[3/2] w-full rounded-xl object-cover"
          />
          <p className="mt-2 text-xs text-muted-foreground">{article.imageCredit}</p>

          <div className="mt-10 space-y-5">
            {article.corps.map((bloc, i) => {
              if (bloc.type === "h2") {
                return (
                  <h2 key={i} className="pt-4 text-xl font-bold text-foreground md:text-2xl">
                    {bloc.texte}
                  </h2>
                );
              }
              if (bloc.type === "liste") {
                return (
                  <ul key={i} className="space-y-2 pl-5">
                    {bloc.items.map((item) => (
                      <li key={item} className="list-disc text-foreground/90">{item}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="leading-relaxed text-foreground/90">{bloc.texte}</p>
              );
            })}
          </div>

          <section className="mt-12 rounded-xl border border-border bg-muted/30 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Sources
            </h2>
            <ul className="mt-3 space-y-2">
              {article.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    {s.libelle}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {autres.length > 0 && (
            <section className="mt-12 border-t border-border pt-8">
              <h2 className="text-lg font-bold text-foreground">À lire aussi</h2>
              <ul className="mt-4 space-y-3">
                {autres.map((a) => (
                  <li key={a.slug}>
                    <Link
                      to={`/blog/${a.slug}`}
                      className="block rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="font-semibold text-foreground">{a.titre}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{a.chapo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Link
            to="/blog"
            className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Tous les articles
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}
