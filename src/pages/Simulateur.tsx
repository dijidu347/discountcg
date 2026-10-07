import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { ROUTES_SEO } from "@/data/seoRoutes";

const SEO = ROUTES_SEO["/simulateur"];
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/components/seo/schemas";
import { SimulateurSection } from "@/components/SimulateurSection";
import { TarifsCarteGrise, faqTarifs, faqService } from "@/components/seo/TarifsCarteGrise";
import { Shield, Clock, FileCheck, CheckCircle, ArrowRight } from "lucide-react";

export default function Simulateur() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type") || "";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={SEO.title}
        description={SEO.description}
        canonical={SEO.canonical}
        schema={[
          breadcrumbSchema([
            { name: "Accueil", url: "https://discountcartegrise.fr/" },
            { name: "Simulateur prix carte grise", url: "https://discountcartegrise.fr/simulateur" },
          ]),
          serviceSchema(
            "Simulateur prix carte grise",
            "Calculez le prix de votre carte grise gratuitement et instantanément. Tarifs officiels 2026.",
            "30",
            "https://discountcartegrise.fr/simulateur"
          ),
          faqSchema([
            ...faqTarifs, ...faqService,
          ]),
        ]}
      />
      <Navbar />

      {/* Hero + Simulateur */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">
              Simulateur prix carte grise 2026
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Calculez gratuitement et instantanément le coût de votre carte grise.
              Tarifs officiels à jour par département, résultat en 30 secondes.
            </p>
          </div>
          <SimulateurSection initialType={typeParam} />
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Pourquoi utiliser notre simulateur de carte grise ?
          </h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6 bg-card rounded-xl border border-border">
              <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Service agréé</h3>
              <p className="text-sm text-muted-foreground">Habilité par l'État, agrément Préfecture N° 285046</p>
            </div>
            <div className="text-center p-6 bg-card rounded-xl border border-border">
              <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Résultat instantané</h3>
              <p className="text-sm text-muted-foreground">Obtenez le prix exact de votre carte grise en 30 secondes</p>
            </div>
            <div className="text-center p-6 bg-card rounded-xl border border-border">
              <FileCheck className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Tarifs officiels 2026</h3>
              <p className="text-sm text-muted-foreground">Prix à jour selon votre département et type de véhicule</p>
            </div>
            <div className="text-center p-6 bg-card rounded-xl border border-border">
              <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Frais dès 30€</h3>
              <p className="text-sm text-muted-foreground">Frais de dossier parmi les plus bas du marché</p>
            </div>
          </div>
        </div>
      </section>

      {/* Le contenu rapatrié de /prix-carte-grise */}
      <TarifsCarteGrise />

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Prêt à faire votre carte grise en ligne ?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Service agréé par l'État, traitement sous 24h, frais de dossier dès 30€.
          </p>
          <Link
            to="/carte-grise"
            className="inline-flex items-center gap-2 bg-background text-primary hover:bg-background/90 font-semibold py-4 px-8 rounded-xl text-lg transition-colors"
          >
            Voir toutes nos démarches
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
