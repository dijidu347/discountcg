import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { serviceSchema, faqSchema, breadcrumbSchema } from "@/components/seo/schemas";
import { getDemarcheBySlug, demarchesConfig } from "@/data/demarchesConfig";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  FileText,
  Clock,
  Shield,
  ChevronRight,
  ArrowRight,
  Home,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

const CG_TYPES = ["CG", "CG_DA", "CG_IMPORT", "CG_NEUF"];

const DemarchePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const demarche = slug ? getDemarcheBySlug(slug) : undefined;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);

  const isCG = demarche ? CG_TYPES.includes(demarche.code) : false;

  const handleStartDemarche = async () => {
    if (!demarche) return;

    if (isCG) {
      navigate(`/simulateur?type=${demarche.code}`);
      return;
    }

    setStarting(true);
    try {
      const { data: typeData } = await supabase
        .from("guest_demarche_types")
        .select("prix_base")
        .eq("code", demarche.code)
        .single();

      const prixHT = typeData?.prix_base || 30;

      const { data, error } = await supabase
        .from("guest_orders")
        .insert({
          tracking_number: "",
          immatriculation: "",
          email: "",
          telephone: "",
          nom: "",
          prenom: "",
          adresse: "",
          code_postal: "",
          ville: "",
          montant_ht: prixHT,
          montant_ttc: prixHT,
          frais_dossier: prixHT,
          status: "en_attente",
          paye: false,
          demarche_type: demarche.code,
        })
        .select("id")
        .single();

      if (error) throw error;

      navigate(`/demarche-simple?orderId=${data.id}&type=${demarche.code}`);
    } catch (error) {
      console.error("Erreur création commande:", error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la démarche",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  if (!demarche) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Page introuvable</h1>
          <p className="text-muted-foreground mb-8">
            La demarche que vous recherchez n'existe pas ou a ete deplacee.
          </p>
          <Link to="/">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Retour a l'accueil
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const baseUrl = "https://discountcartegrise.fr";
  const pageUrl = `${baseUrl}/${demarche.slug}`;

  const otherDemarches = demarchesConfig
    .filter((d) => d.slug !== demarche.slug)
    .slice(0, 4);

  const schemas = [
    serviceSchema(demarche.title, demarche.description, isCG ? "30" : "19.90", pageUrl),
    faqSchema(demarche.faqs),
    breadcrumbSchema([
      { name: "Accueil", url: baseUrl },
      { name: demarche.title, url: pageUrl },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={demarche.metaTitle}
        description={demarche.metaDescription}
        canonical={pageUrl}
        schema={schemas}
      />
      <Navbar />

      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 pt-24 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link to="/" className="hover:text-primary transition-colors">
              Accueil
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="text-foreground font-medium">{demarche.title}</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl">
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Agree par l'Etat
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Traitement {demarche.delai}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            {demarche.h1}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">{demarche.description}</p>
          <Button size="lg" className="text-base" onClick={handleStartDemarche} disabled={starting}>
            {starting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isCG ? "Simuler mon tarif" : "Commander maintenant"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Long Description */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Qu'est-ce que {demarche.shortTitle.toLowerCase()} ?
          </h2>
          <div className="prose prose-lg text-muted-foreground">
            {demarche.longDescription.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-2">Sources officielles</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <a
                  href="https://www.service-public.fr/particuliers/vosdroits/N367"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Service-Public.fr - Carte grise (certificat d'immatriculation)
                </a>
              </li>
              <li>
                <a
                  href="https://ants.gouv.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ANTS - Agence Nationale des Titres Securises
                </a>
              </li>
            </ul>
          </div>
          <div className="mt-4 p-4 bg-primary/5 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-2">Voir aussi</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link to="/prix-carte-grise" className="text-primary hover:underline">
                  Prix carte grise 2026 par departement
                </Link>
              </li>
              <li>
                <Link to="/simulateur" className="text-primary hover:underline">
                  Simulateur gratuit de prix carte grise
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Documents Section */}
      <section className="bg-muted/50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Documents necessaires
            </h2>
            <Card className="p-6">
              <ul className="space-y-3">
                {demarche.documents.map((doc, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-foreground">{doc}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Comment faire votre {demarche.shortTitle.toLowerCase()} en ligne ?
          </h2>
          <div className="space-y-4">
            {demarche.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <p className="text-foreground pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prix Section */}
      <section className="bg-muted/50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Prix de {demarche.shortTitle.toLowerCase()}
            </h2>
            <p className="text-muted-foreground mb-4">
              {demarche.prixDescription}
            </p>
            {isCG ? (
              <>
                <p className="text-muted-foreground mb-6">
                  Pour connaitre le prix exact de votre demarche,{" "}
                  <Link to="/simulateur" className="text-primary font-medium hover:underline">
                    simulez votre tarif en quelques clics
                  </Link>
                  .
                </p>
                <Link to="/simulateur">
                  <Button variant="outline">
                    Simuler mon tarif
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <Button variant="outline" onClick={handleStartDemarche} disabled={starting}>
                {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Commander maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Delai Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Delai de traitement
          </h2>
          <Card className="p-6 flex items-start gap-4">
            <Clock className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div>
              <p className="text-foreground font-medium mb-2">
                Traitement en {demarche.delai}
              </p>
              <p className="text-muted-foreground">
                Des la validation de votre dossier, vous recevez un Certificat Provisoire
                d'Immatriculation (CPI) par email, vous permettant de circuler immediatement.
                Votre document definitif est ensuite envoye par courrier recommande sous 3 a 5
                jours ouvrables.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      {demarche.faqs.length > 0 && (
        <section className="bg-muted/50 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Questions frequentes sur {demarche.shortTitle.toLowerCase()}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {demarche.faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      )}

      {/* Avantages Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Pourquoi choisir Discount Carte Grise ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Service agree par l'Etat</p>
                  <p className="text-xs text-muted-foreground">Habilitation Prefecture N° 285046</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Traitement rapide</p>
                  <p className="text-xs text-muted-foreground">Votre dossier traite sous 24h maximum</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">100% en ligne</p>
                  <p className="text-xs text-muted-foreground">Plus besoin de se deplacer en prefecture</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Meilleur prix garanti</p>
                  <p className="text-xs text-muted-foreground">Carte grise pas chere, frais des 19,90 euros</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Related Demarches */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Autres demarches
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {otherDemarches.map((d) => (
              <Link key={d.slug} to={`/${d.slug}`}>
                <Card className="p-4 h-full hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">{d.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Pret a commencer ?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Faites votre {demarche.shortTitle.toLowerCase()} en ligne en quelques minutes.
            Service agree par l'Etat, traitement rapide et securise.
          </p>
          <Button size="lg" variant="secondary" className="text-base" onClick={handleStartDemarche} disabled={starting}>
            {starting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isCG ? "Simuler mon tarif" : "Commander maintenant"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DemarchePage;
