// La carte des tarifs sur la page d'accueil.
//
// Elle y est pour deux raisons, et la seconde est la vraie.
//
// La première : l'accueil n'avait aucun visuel, c'est le reproche qui nous a
// été fait.
//
// La seconde : les cent une pages départementales n'avaient qu'une seule
// entrée depuis l'accueil, un lien de pied de page à 7 297 pixels du haut sur
// 7 449 — à quatre-vingt-dix-huit pour cent du bas. Il existait sans être
// trouvable, ce qui revenait au même.
//
// Le tracé pèse 33 Ko : la carte est donc chargée en différé, quand la section
// approche de l'écran. Elle ne coûte rien au premier affichage, qu'on a mis du
// temps à ramener à 0,7 seconde.

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronRight } from "lucide-react";
import { TARIF_MIN, TARIF_MAX, euroCourt, REGIONS_TARIFS } from "@/data/carteTarifs";

const CarteDesTarifs = lazy(() =>
  import("@/components/seo/CarteDesTarifs").then((m) => ({ default: m.CarteDesTarifs })),
);

export function AperçuCarteTarifs() {
  const ancre = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const n = ancre.current;
    if (!n || visible) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const o = new IntersectionObserver(
      (e) => e[0]?.isIntersecting && setVisible(true),
      { rootMargin: "300px" },
    );
    o.observe(n);
    return () => o.disconnect();
  }, [visible]);

  const moinsCher = REGIONS_TARIFS[0];
  const plusCher = REGIONS_TARIFS[REGIONS_TARIFS.length - 1];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Le prix de la carte grise, département par département
          </h2>
          <p className="mt-3 text-muted-foreground">
            Le tarif du cheval fiscal est voté par chaque région : il va de{" "}
            <strong className="text-foreground">{euroCourt(TARIF_MIN)}</strong> {moinsCher.nom === "Mayotte" ? "à Mayotte" : `en ${moinsCher.nom}`} à{" "}
            <strong className="text-foreground">{euroCourt(TARIF_MAX)}</strong> en {plusCher.nom}.
            C'est votre adresse qui décide, jamais le lieu d'achat.
          </p>
        </div>

        <div ref={ancre} className="mx-auto max-w-3xl rounded-xl border bg-card p-4 sm:p-6">
          {visible ? (
            <Suspense fallback={<div className="h-[320px] animate-pulse rounded-lg bg-muted" />}>
              <CarteDesTarifs />
            </Suspense>
          ) : (
            <div className="h-[320px] rounded-lg bg-muted/60" aria-hidden />
          )}
        </div>

        <div className="mt-8 text-center">
          <Button asChild size="lg">
            <Link to="/carte-grise-par-departement">
              <MapPin className="mr-2 h-5 w-5" />
              Voir les 101 départements
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
