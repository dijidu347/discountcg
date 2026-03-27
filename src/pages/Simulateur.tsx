import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/components/seo/schemas";
import { SimulateurSection } from "@/components/SimulateurSection";
import { Shield, Clock, FileCheck, CheckCircle, ArrowRight } from "lucide-react";

export default function Simulateur() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type") || "";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Simulateur Prix Carte Grise 2026 Gratuit | Résultat Instantané"
        description="Calculez gratuitement le prix de votre carte grise en ligne. Simulateur à jour des tarifs 2026 par département. Résultat instantané, frais de dossier dès 30€."
        canonical="https://discountcartegrise.fr/simulateur"
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
            { question: "Comment est calculé le prix d'une carte grise ?", answer: "Le prix d'une carte grise dépend de la puissance fiscale du véhicule, du tarif du cheval fiscal de votre département, de l'âge du véhicule et du type de carburant. Notre simulateur calcule automatiquement ces éléments." },
            { question: "Le simulateur est-il gratuit ?", answer: "Oui, notre simulateur de prix carte grise est 100% gratuit et sans engagement. Vous obtenez le résultat instantanément." },
            { question: "Les tarifs sont-ils à jour ?", answer: "Oui, notre simulateur utilise les tarifs officiels 2026 en vigueur, mis à jour à chaque changement de tarification régionale." },
            { question: "Quels frais de dossier appliquez-vous ?", answer: "Nos frais de dossier commencent à partir de 30€. C'est l'un des tarifs les plus compétitifs du marché pour un service agréé par l'État." },
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

      {/* Contenu SEO */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            Comment est calculé le prix d'une carte grise ?
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>
              Le prix d'une carte grise (certificat d'immatriculation) est composé de plusieurs taxes calculées selon les caractéristiques de votre véhicule et votre lieu de résidence. Notre simulateur prend en compte tous ces éléments pour vous donner un prix précis et transparent.
            </p>
            <h3 className="text-xl font-semibold text-foreground">Les composantes du prix</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Taxe régionale (Y.1)</strong> : calculée selon la puissance fiscale et le tarif du cheval fiscal de votre département</li>
              <li><strong>Taxe de formation professionnelle (Y.2)</strong> : pour les véhicules utilitaires uniquement</li>
              <li><strong>Taxe CO2 (Y.3)</strong> : basée sur les émissions de CO2 du véhicule</li>
              <li><strong>Taxe de gestion (Y.4)</strong> : 11€ fixe</li>
              <li><strong>Redevance d'acheminement (Y.5)</strong> : 2,76€ fixe</li>
            </ul>
            <h3 className="text-xl font-semibold text-foreground">Exonérations possibles</h3>
            <p>
              Les véhicules de plus de 10 ans bénéficient d'une réduction de 50% sur la taxe régionale. Les véhicules électriques et hybrides peuvent être exonérés totalement ou partiellement selon les régions.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Questions fréquentes sur le prix de la carte grise
          </h2>
          <div className="space-y-4">
            {[
              { q: "Comment est calculé le prix d'une carte grise ?", a: "Le prix dépend de la puissance fiscale du véhicule, du tarif du cheval fiscal de votre département, de l'âge du véhicule et du type de carburant. Notre simulateur calcule automatiquement ces éléments." },
              { q: "Le simulateur est-il gratuit ?", a: "Oui, notre simulateur de prix carte grise est 100% gratuit et sans engagement. Vous obtenez le résultat instantanément." },
              { q: "Les tarifs sont-ils à jour ?", a: "Oui, notre simulateur utilise les tarifs officiels 2026 en vigueur, mis à jour à chaque changement de tarification régionale." },
              { q: "Quels frais de dossier appliquez-vous ?", a: "Nos frais de dossier commencent à partir de 30€. C'est l'un des tarifs les plus compétitifs du marché pour un service agréé par l'État." },
            ].map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
