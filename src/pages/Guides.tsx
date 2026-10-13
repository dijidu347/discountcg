// `/guides` : les vingt-et-une pages de contenu du site, rangées par sujet.
//
// Le menu « Démarches » mène droit au formulaire : celui qui l'ouvre vient
// commander. Ces pages-là servent l'autre visiteur — celui qui arrive de
// Google avec une question, et celui qui veut savoir ce qu'on lui demandera
// avant de se lancer. Elles ont donc leur onglet, et non une place dans le
// menu des démarches ni dans le blog, qui ne porte que des articles datés.
//
// Les icônes viennent du menu : la même démarche porte le même signe partout
// sur le site, sinon l'icône ne sert qu'à décorer. Le délai affiché sur chaque
// carte est le vrai, lu dans demarchesConfig — c'est la première question
// qu'on pose, et la donner ici évite une visite pour rien.

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ChevronRight, Clock, FileText, ShieldCheck, Building2, Award, ClipboardCheck,
  ShoppingCart, Wrench, Car, type LucideIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GUIDES, TOUS_LES_GUIDES, type GroupeGuides } from "@/data/guides";
import { MENU_DEMARCHES } from "@/data/menuDemarches";

/** Chemin → icône, reprise du menu pour que le signe soit le même partout. */
const ICONES: Record<string, LucideIcon> = {
  ...Object.fromEntries(
    MENU_DEMARCHES.flatMap((g) => g.entrees).map((e) => [e.chemin, e.icone]),
  ),
  "/certificat-de-non-gage": ShieldCheck,
  "/carte-grise-professionnel": Building2,
  "/habilitation-siv": Award,
};

// Une teinte par famille. Les classes sont écrites en entier : Tailwind lit le
// code source pour savoir quoi produire, une classe composée à l'exécution
// (`bg-${couleur}-100`) n'existerait tout simplement pas dans la feuille.
const TEINTES: Record<
  GroupeGuides["teinte"],
  { panneau: string; pastille: string; tuile: string; titre: string; puce: string; icone: LucideIcon }
> = {
  bleu: {
    panneau: "border-primary/20 bg-primary/[0.04]",
    pastille: "bg-primary text-primary-foreground",
    tuile: "bg-primary/10 text-primary",
    titre: "text-primary",
    puce: "bg-primary/10 text-primary",
    icone: ShoppingCart,
  },
  vert: {
    panneau: "border-emerald-200 bg-emerald-50/50",
    pastille: "bg-emerald-600 text-white",
    tuile: "bg-emerald-100 text-emerald-700",
    titre: "text-emerald-700",
    puce: "bg-emerald-100 text-emerald-700",
    icone: Wrench,
  },
  ambre: {
    panneau: "border-amber-200 bg-amber-50/50",
    pastille: "bg-amber-500 text-white",
    tuile: "bg-amber-100 text-amber-700",
    titre: "text-amber-700",
    puce: "bg-amber-100 text-amber-700",
    icone: Car,
  },
  rose: {
    panneau: "border-rose-200 bg-rose-50/50",
    pastille: "bg-rose-600 text-white",
    tuile: "bg-rose-100 text-rose-700",
    titre: "text-rose-700",
    puce: "bg-rose-100 text-rose-700",
    icone: Building2,
  },
};

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
          </p>

          <ul className="mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-3 text-sm">
            <li className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5">
              <FileText className="h-4 w-4 text-primary" />
              <span><strong className="font-semibold text-foreground">{TOUS_LES_GUIDES.length}</strong> guides</span>
            </li>
            <li className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span>Traitement <strong className="font-semibold text-foreground">sous 24 h</strong> en moyenne</span>
            </li>
            <li className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <span>Habilité <strong className="font-semibold text-foreground">n° 285046</strong></span>
            </li>
          </ul>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {GUIDES.map((groupe) => {
            const teinte = TEINTES[groupe.teinte];
            const IconeGroupe = teinte.icone;
            return (
              <section
                key={groupe.titre}
                className={`rounded-2xl border p-5 md:p-6 ${teinte.panneau}`}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${teinte.pastille}`}
                    aria-hidden
                  >
                    <IconeGroupe className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className={`text-lg font-extrabold ${teinte.titre}`}>{groupe.titre}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{groupe.intro}</p>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5">
                  {groupe.guides.map((g) => {
                    const Icone = ICONES[g.chemin] ?? FileText;
                    return (
                      <li key={g.chemin}>
                        <Link
                          to={g.chemin}
                          className="group flex gap-3.5 rounded-xl border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-current hover:shadow-md"
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${teinte.tuile}`}
                            aria-hidden
                          >
                            <Icone className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`flex items-center gap-1 font-semibold text-foreground transition-colors group-hover:${teinte.titre}`}>
                              {g.libelle}
                              <ChevronRight className="h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                            </span>
                            <span className="mt-0.5 block text-sm text-muted-foreground">{g.resume}</span>
                            {g.delai && (
                              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${teinte.puce}`}>
                                <Clock className="h-3 w-3" />
                                {g.delai}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-14 text-center text-sm text-muted-foreground">
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
