// `/demarrer/CG` : commander une carte grise, sans détour par la page de prix.
//
// Le menu envoyait sur `/simulateur`, une page intitulée « Simulateur prix
// carte grise 2026 » et suivie de quatre sections de contenu : on cliquait
// « Carte grise » et on tombait sur un article. Or le prix d'une carte grise
// contient la taxe régionale, qui dépend de la plaque et du département — on
// ne peut pas afficher une commande payable avant de les connaître.
//
// Cette page garde donc l'étape, mais pas l'article : le même champ, nommé
// pour ce qu'il est, et plus rien en dessous. Elle est en `noindex` : c'est
// `/simulateur` qui est positionné sur Google, et deux pages pour la même
// requête se feraient concurrence.

import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SimulateurSection } from "@/components/SimulateurSection";
import { getDemarcheByCode } from "@/data/demarchesConfig";

export default function CommanderCarteGrise() {
  const [searchParams] = useSearchParams();
  // Les démarches dont le prix comprend une taxe passent toutes par ici.
  const code = searchParams.get("type") || "CG";
  const demarche = getDemarcheByCode(code);
  const titre = code === "CG" ? "Commander ma carte grise" : `Commander : ${demarche?.shortTitle ?? "ma démarche"}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${titre} | Discount Carte Grise`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <Navbar />

      <section className="bg-gradient-to-b from-primary/5 to-background pb-2 pt-24 md:pb-6 md:pt-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
              Étape 1 sur 2
            </p>
            <h1 className="mb-3 text-3xl font-extrabold text-foreground md:text-4xl">
              {titre}
            </h1>
            <p className="text-muted-foreground">
              Votre plaque et votre département suffisent : le prix exact s'affiche
              aussitôt, taxes comprises, et vous enchaînez sur votre commande.
            </p>
          </div>
          <SimulateurSection initialType={code} sansEnTete />
        </div>
      </section>

      <Footer />
    </div>
  );
}
