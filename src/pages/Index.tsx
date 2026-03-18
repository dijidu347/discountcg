import { SEOHead } from "@/components/seo/SEOHead";
import { organizationSchema, webSiteSchema, breadcrumbSchema } from "@/components/seo/schemas";
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
        description="Faites votre carte grise en ligne au meilleur prix. Service agree par l'Etat, traitement sous 24h, des 30 euros. Simulez et commandez maintenant."
        canonical="https://discountcartegrise.fr/"
        schema={[organizationSchema(), webSiteSchema(), breadcrumbSchema([{ name: "Accueil", url: "https://discountcartegrise.fr/" }])]}
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
