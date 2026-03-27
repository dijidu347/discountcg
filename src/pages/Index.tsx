import { SEOHead } from "@/components/seo/SEOHead";
import { organizationSchema, webSiteSchema, breadcrumbSchema, faqSchema, webPageSchema } from "@/components/seo/schemas";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Process from "@/components/Process";
import WhyUs from "@/components/WhyUs";
import FAQ from "@/components/FAQ";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Services from "@/components/Services";
import { GoogleReviewsCarousel } from "@/components/GoogleReviewsCarousel";
import { TrustSection } from "@/components/TrustSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Carte Grise Pas Chere en Ligne | Discount Carte Grise - 24h"
        description="Faites votre carte grise en ligne au meilleur prix. Service agréé par l'État, traitement sous 24h, dès 30 euros. Simulez et commandez maintenant."
        canonical="https://discountcartegrise.fr/"
        schema={[organizationSchema(), webSiteSchema(), breadcrumbSchema([{ name: "Accueil", url: "https://discountcartegrise.fr/" }]), webPageSchema("Carte Grise Pas Chère en Ligne", "Service de carte grise en ligne agréé par l'État. Traitement sous 24h.", "https://discountcartegrise.fr/", "2025-11-01", "2026-03-18"), faqSchema([{question:"Quels documents faut-il pour une carte grise professionnelle ?",answer:"Pour une carte grise professionnelle, vous devez fournir : un Kbis de moins de 3 mois, une pièce d'identité du gérant, le certificat de cession du véhicule, le contrôle technique valide, et un mandat de représentation."},{question:"Quel est le délai de traitement d'un dossier ?",answer:"Nous traitons votre dossier en moins de 24 heures ouvrées dès réception de l'ensemble des pièces justificatives."},{question:"Le paiement en ligne est-il sécurisé ?",answer:"Oui, tous nos paiements sont sécurisés par cryptage SSL et conformes aux normes PCI DSS. Nous acceptons les cartes bancaires et PayPal."},{question:"Puis-je suivre l'avancement de mon dossier ?",answer:"Oui, vous recevez des notifications automatiques par email à chaque étape du traitement de votre dossier."},{question:"Que faire si je n'ai pas tous les documents ?",answer:"Contactez-nous ! Notre équipe d'experts vous guidera pour obtenir les documents manquants."},{question:"Travaillez-vous avec les professionnels ?",answer:"Oui, nous proposons des tarifs et services spécifiques pour les professionnels de l'automobile."},{question:"Puis-je annuler ma demande ?",answer:"Oui, vous pouvez annuler votre demande avant le début du traitement de votre dossier."},{question:"Quelles régions couvrez-vous ?",answer:"Nous intervenons sur toute la France métropolitaine et les DOM-TOM. Nos services sont 100% en ligne."}])]}
      />
      <Navbar />
      <Hero />
      <Services />
      <TrustSection />
      <GoogleReviewsCarousel />
      <Process />
      <WhyUs />
      <FAQ />
      <ContactForm />
      <Footer />
    </div>
  );
};

export default Index;
