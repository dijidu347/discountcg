// La page qui manquait : l'index des cent une pages départementales.
//
// Elles n'existaient nulle part dans la navigation. Un visiteur ne pouvait les
// atteindre qu'en devinant d'aller sur le simulateur, puis en déroulant un
// tableau au fond de la page. Elles étaient trouvables par Google, pas par un
// humain — et c'est exactement ce qu'on nous a reproché.
//
// Cette page règle les deux : la carte donne le visuel et l'entrée naturelle,
// la liste au-dessous donne l'arborescence, pour le lecteur comme pour le
// robot.

import { useCallback } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { ROUTES_SEO } from "@/data/seoRoutes";
import { organizationSchema, breadcrumbSchema, webPageSchema } from "@/components/seo/schemas";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Calculator } from "lucide-react";
import { CarteDesTarifs, ListeDesRegions } from "@/components/seo/CarteDesTarifs";
import { REGIONS_TARIFS, TARIF_MIN, TARIF_MAX, TARIF_MOYEN, euroCourt } from "@/data/carteTarifs";

const SEO = ROUTES_SEO["/carte-grise-par-departement"];

export default function CarteGriseParDepartement() {
  const versRegion = useCallback((cle: string) => {
    document.getElementById(`region-${cle}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const moinsCher = REGIONS_TARIFS[0];
  const plusCher = REGIONS_TARIFS[REGIONS_TARIFS.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={SEO.title}
        description={SEO.description}
        canonical={SEO.canonical}
        schema={[
          organizationSchema(),
          webPageSchema(SEO.h1, SEO.description, SEO.canonical, "2026-10-13", "2026-10-13"),
          breadcrumbSchema([
            { name: "Accueil", url: "https://discountcartegrise.fr/" },
            { name: "Carte grise par département", url: SEO.canonical },
          ]),
        ]}
      />
      <Navbar />

      <main className="container mx-auto px-4 py-10">
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary hover:underline">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Carte grise par département</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground">{SEO.h1}</h1>
        <div className="mt-4 max-w-3xl space-y-3 text-muted-foreground">
          {SEO.intro.map((p: string, i: number) => <p key={i}>{p}</p>)}
        </div>

        <div className="my-10 rounded-xl border bg-card p-4 sm:p-6">
          <CarteDesTarifs onChoisir={versRegion} />
        </div>

        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">Le moins cher</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{euroCourt(TARIF_MIN)}</p>
              <p className="text-sm text-muted-foreground">{moinsCher.nom}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">Moyenne des départements</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {TARIF_MOYEN.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €
              </p>
              <p className="text-sm text-muted-foreground">sur les 101 départements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">Le plus cher</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{euroCourt(TARIF_MAX)}</p>
              <p className="text-sm text-muted-foreground">{plusCher.nom}</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="mb-6 text-2xl font-bold text-foreground">
          Les 101 départements, par région
        </h2>
        <ListeDesRegions />

        <Card className="mt-12 bg-primary/5 border-primary/20">
          <CardContent className="py-5">
            <Link to="/simulateur" className="flex items-center gap-3 font-medium text-primary hover:underline">
              <Calculator className="h-5 w-5 shrink-0" />
              Calculer le prix exact à partir de votre plaque
              <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
            </Link>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
