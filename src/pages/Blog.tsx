// `/blog` : l'actualité de la carte grise, et l'index des guides du site.
//
// Des articles datés, et rien d'autre : ce qui change dans la réglementation,
// vérifié à la source. Les guides du site ont leur propre onglet — ils ne sont
// pas de l'actualité, et les mêler ici brouillait les deux.

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ARTICLES_TRIES, COULEURS_CATEGORIE, dateEnFrancais, type Article } from "@/data/articles";

function Etiquette({ categorie }: { categorie: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        COULEURS_CATEGORIE[categorie] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {categorie}
    </span>
  );
}

function CarteArticle({ article, grande = false }: { article: Article; grande?: boolean }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
      <Link to={`/blog/${article.slug}`} className="block overflow-hidden">
        <img
          src={article.image}
          alt=""
          loading="lazy"
          className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            grande ? "h-64 md:h-80" : "h-44"
          }`}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={article.date}>{dateEnFrancais(article.date)}</time>
          <Etiquette categorie={article.categorie} />
        </div>
        <h3 className={`font-bold leading-snug text-foreground ${grande ? "text-2xl" : "text-base"}`}>
          <Link to={`/blog/${article.slug}`} className="hover:text-primary">
            {article.titre}
          </Link>
        </h3>
        <p className={`text-muted-foreground ${grande ? "text-base" : "text-sm line-clamp-3"}`}>
          {article.chapo}
        </p>
        <Link
          to={`/blog/${article.slug}`}
          className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-primary"
        >
          Lire la suite <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export default function Blog() {
  const [une, ...autres] = ARTICLES_TRIES;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Le blog : l'actualité de la carte grise | Discount Carte Grise</title>
        <meta
          name="description"
          content="Ce qui change vraiment pour la carte grise : réglementation, tarifs, obligations des professionnels. Chaque article est vérifié sur Légifrance et les sites officiels."
        />
        <link rel="canonical" href="https://discountcartegrise.fr/blog" />
      </Helmet>
      <Navbar />

      <nav aria-label="Fil d'Ariane" className="border-b border-border bg-muted/30 pt-20">
        <div className="container mx-auto flex items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Le blog</span>
        </div>
      </nav>

      <header className="border-b border-border bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">
            Le blog Discount Carte Grise
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Ce qui change vraiment pour votre carte grise. Chaque article cite le texte
            officiel sur lequel il s'appuie.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section>
            <h2 className="mb-5 text-xl font-bold text-foreground">À la une</h2>
            {une && <CarteArticle article={une} grande />}
          </section>

          <section>
            <h2 className="mb-5 text-xl font-bold text-foreground">Les plus récents</h2>
            {autres.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {autres.map((a) => (
                  <CarteArticle key={a.slug} article={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Un nouvel article paraît chaque semaine.
              </p>
            )}
          </section>
        </div>

        <p className="mt-14 border-t border-border pt-8 text-center text-muted-foreground">
          Vous cherchez plutôt les pièces à fournir ou les délais d'une démarche ?{" "}
          <Link to="/guides" className="font-semibold text-primary hover:underline">
            Voir nos guides pratiques
          </Link>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
}
