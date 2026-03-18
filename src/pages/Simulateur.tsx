import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { breadcrumbSchema } from "@/components/seo/schemas";
import { SimulateurSection } from "@/components/SimulateurSection";

export default function Simulateur() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type") || "";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Simulateur Gratuit Prix Carte Grise | Resultat Instantane"
        description="Calculez gratuitement le prix de votre carte grise avec notre simulateur instantane. Tarifs 2026 a jour par departement. Lancez votre simulation en 30 secondes."
        canonical="https://discountcartegrise.fr/simulateur"
        schema={[breadcrumbSchema([
          { name: "Accueil", url: "https://discountcartegrise.fr/" },
          { name: "Simulateur", url: "https://discountcartegrise.fr/simulateur" },
        ])]}
      />
      <Navbar />
      <div className="py-12">
        <div className="container mx-auto px-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simulateur de prix carte grise
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Estimez le cout de votre carte grise en quelques clics et obtenez le meilleur prix.
            Notre simulateur gratuit calcule automatiquement le montant des taxes selon la puissance fiscale
            de votre vehicule et votre departement de residence. Faire sa carte grise n'a jamais ete aussi simple :
            le resultat est instantane et sans engagement.
          </p>
        </div>
        <SimulateurSection initialType={typeParam} />
      </div>
      <Footer />
    </div>
  );
}
