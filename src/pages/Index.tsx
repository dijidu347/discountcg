import { SEOHead } from "@/components/seo/SEOHead";
import { ROUTES_SEO } from "@/data/seoRoutes";
import { FAQ_ACCUEIL } from "@/data/accueilContenu";

const SEO = ROUTES_SEO["/"];
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
        title={SEO.title}
        description={SEO.description}
        canonical={SEO.canonical}
        schema={[organizationSchema(), webSiteSchema(), breadcrumbSchema([{ name: "Accueil", url: "https://discountcartegrise.fr/" }]), webPageSchema("Carte Grise Pas Chère en Ligne", "Service de carte grise en ligne agréé par l'État. Traitement sous 24h.", "https://discountcartegrise.fr/", "2025-11-01", "2026-03-18"), faqSchema(FAQ_ACCUEIL)]}
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
