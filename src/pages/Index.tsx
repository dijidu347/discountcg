import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Process from "@/components/Process";
import WhyUs from "@/components/WhyUs";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import { GoogleReviewsCarousel } from "@/components/GoogleReviewsCarousel";
import { SimulateurSection } from "@/components/SimulateurSection";
import { TrustSection } from "@/components/TrustSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <SimulateurSection />
      <Services />
      <GoogleReviewsCarousel />
      <Process />
      <WhyUs />
      <Pricing />
      <TrustSection />
      <FAQ />
      <ContactForm />
      <Footer />
    </div>
  );
};

export default Index;
