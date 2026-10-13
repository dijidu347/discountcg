// `/guides` : les vingt-et-une pages de contenu du site, rangées par sujet.
//
// Le menu « Démarches » mène droit au formulaire : celui qui l'ouvre vient
// commander. Ces pages-là servent l'autre visiteur — celui qui arrive de
// Google avec une question, et celui qui veut savoir ce qu'on lui demandera
// avant de se lancer. Elles ont donc leur onglet, et non une place dans le
// menu des démarches ni dans le blog, qui ne porte que des articles datés.

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GUIDES, TOUS_LES_GUIDES } from "@/data/guides";

export default function Guides() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Nos guides pratiques : toutes les démarches expliquées | Discount Carte Grise</title>
        <meta
          name="description"
          content="Les pièces à fournir, les délais et les prix, démarche par démarche : vente, déménagement, succession, duplicata, import, deux-roues, professionnels."
        />
        <link rel="canonical" href="https://discountcartegrise.fr/guides" />
      </Helmet>
      <Navbar />

      <nav aria-label="Fil d'Ariane" className="border-b border-border bg-muted/30 pt-20">
        <div className="container mx-auto flex items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Nos guides</span>
        </div>
      </nav>

      <header className="border-b border-border bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">
            Nos guides pratiques
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Les pièces à fournir, les délais et les prix, démarche par démarche.
            {" "}{TOUS_LES_GUIDES.length} guides, écrits à partir des textes en vigueur.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2">
          {GUIDES.map((groupe) => (
            <section key={groupe.titre}>
              <h2 className="text-lg font-bold text-foreground">{groupe.titre}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{groupe.intro}</p>
              <ul className="mt-4 space-y-3">
                {groupe.guides.map((g) => (
                  <li key={g.chemin}>
                    <Link
                      to={g.chemin}
                      className="group block rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="flex items-center gap-1 font-semibold text-foreground group-hover:text-primary">
                        {g.libelle}
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{g.resume}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Vous savez déjà ce qu'il vous faut ?{" "}
          <Link to="/simulateur" className="font-semibold text-primary hover:underline">
            Calculez votre tarif
          </Link>{" "}
          ou ouvrez votre démarche depuis le menu.
        </p>
      </main>

      <Footer />
    </div>
  );
}
