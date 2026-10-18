// `/blog` : l'actualité de la carte grise, et l'index des guides du site.
//
// Des articles datés, et rien d'autre : ce qui change dans la réglementation,
// vérifié à la source. Les guides du site ont leur propre onglet — ils ne sont
// pas de l'actualité, et les mêler ici brouillait les deux.

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ARTICLES_TRIES, COULEURS_CATEGORIE, dateEnFrancais, type Article } from "@/data/articles";

// La pagination de « Tous nos articles ».
//
// Elle ne s'affiche que s'il y a plus d'une page : sur sept articles, un
// sélecteur à une seule page ne servirait qu'à occuper de la place. Le blog
// publie deux fois par semaine, elle apparaîtra d'elle-même.
//
// Les pages lointaines sont remplacées par des points de suspension, sinon la
// barre déborderait de l'écran au bout d'un an — c'est ce qu'on voit sur les
// blogs qui ne l'ont pas prévu.
function Pagination({ page, pages, onChange }: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;

  const numeros: (number | "…")[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) numeros.push(n);
    else if (numeros[numeros.length - 1] !== "…") numeros.push("…");
  }

  const bouton = "flex h-9 min-w-9 items-center justify-center rounded-lg border border-border px-3 text-sm transition-colors";

  return (
    <nav aria-label="Pages d'articles" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Page précédente"
        className={`${bouton} bg-background text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {numeros.map((n, i) =>
        n === "…" ? (
          <span key={`saut-${i}`} className="px-1 text-sm text-muted-foreground">…</span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${bouton} ${
              n === page
                ? "border-primary bg-primary font-semibold text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            {n}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        aria-label="Page suivante"
        className={`${bouton} bg-background text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

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
            grande ? "h-64 md:h-80" : "h-36"
          }`}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={article.date}>{dateEnFrancais(article.date)}</time>
          <Etiquette categorie={article.categorie} />
        </div>
        <h3 className={`text-balance font-bold leading-snug text-foreground ${grande ? "text-2xl" : "text-base line-clamp-3"}`}>
          <Link to={`/blog/${article.slug}`} className="hover:text-primary">
            {article.titre}
          </Link>
        </h3>
        <p className={`text-muted-foreground ${grande ? "text-base" : "text-sm line-clamp-2"}`}>
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
  // Le haut de page tient cinq articles : un en grand, quatre en vignettes.
  // Tout le reste descend dans « Tous nos articles ». Avant, les six autres
  // s'entassaient dans la colonne de droite, qui s'allongeait à chaque
  // publication — au rythme de deux par semaine, la page devenait vite
  // illisible.
  const [une, ...suite] = ARTICLES_TRIES;
  const recents = suite.slice(0, 4);
  const reste = suite.slice(4);

  // Neuf par page : trois rangées pleines sur grand écran.
  const PAR_PAGE = 9;
  const pages = Math.max(1, Math.ceil(reste.length / PAR_PAGE));
  const [page, setPage] = useState(1);
  const tousLesArticles = useRef<HTMLElement>(null);
  const visibles = reste.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);

  // Changer de page sans remonter la liste laisserait le lecteur au milieu
  // d'articles qui viennent d'être remplacés sous ses yeux.
  const allerA = (p: number) => {
    setPage(Math.min(Math.max(p, 1), pages));
    tousLesArticles.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
          {/* text-balance : sans lui, le navigateur remplit chaque ligne au
              maximum puis laisse deux mots orphelins sur la dernière. Il
              répartit les mots pour que les lignes aient la même longueur. */}
          <h1 className="text-balance text-3xl font-extrabold text-foreground md:text-4xl">
            Le blog Discount Carte Grise
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-muted-foreground">
            Ce qui change pour votre véhicule, et ce que ça vous coûte.
            Vérifié sur les textes officiels, jamais recopié ailleurs.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* items-start : sans lui, la grille étire les deux colonnes à la même
    hauteur. La carte « À la une » porte h-full — utile pour aligner les
    petites cartes entre elles — et s'allongeait donc sur toute la
    hauteur des six articles de droite, avec un grand vide blanc et le
    « Lire la suite » largué tout en bas. */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="flex flex-col">
            <h2 className="mb-5 text-xl font-bold text-foreground">À la une</h2>
            {/* Le h-full de la carte vaut 100 % de la section, titre compris :
                elle débordait donc de 48 px, la hauteur du « À la une ». Ce
                conteneur lui donne l'espace restant, et les deux colonnes se
                terminent exactement au même endroit. */}
            <div className="flex-1">{une && <CarteArticle article={une} grande />}</div>
          </section>

          <section className="flex flex-col">
            <h2 className="mb-5 text-xl font-bold text-foreground">Les plus récents</h2>
            {recents.length > 0 ? (
              <div className="grid flex-1 gap-5 sm:grid-cols-2 sm:grid-rows-2">
                {recents.map((a) => (
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

        {reste.length > 0 && (
          <section ref={tousLesArticles} className="mt-16 scroll-mt-24 border-t border-border pt-12">
            <h2 className="mb-6 text-xl font-bold text-foreground">Tous nos articles</h2>
            <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibles.map((a) => (
                <CarteArticle key={a.slug} article={a} />
              ))}
            </div>
            <Pagination page={page} pages={pages} onChange={allerA} />
          </section>
        )}

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
