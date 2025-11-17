import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { PriceComparator } from "@/components/PriceComparator";
import IndexV2 from "./IndexV2";

const Index = () => {
  const [version, setVersion] = useState<"v1" | "v2">("v1");

  return (
    <div className="min-h-screen">
      {/* Toggle buttons */}
      <div className="fixed top-20 right-6 z-[100] flex gap-2 bg-white p-2 rounded-lg shadow-lg border-2 border-primary">
        <Button
          variant={version === "v1" ? "default" : "outline"}
          onClick={() => setVersion("v1")}
          size="lg"
          className="font-bold"
        >
          Version 1
        </Button>
        <Button
          variant={version === "v2" ? "default" : "outline"}
          onClick={() => setVersion("v2")}
          size="lg"
          className="font-bold"
        >
          Version 2
        </Button>
      </div>

      {version === "v1" ? (
        <>
          <Navbar />
          <Hero />
          <GoogleReviewsCarousel />
          <PriceComparator />
          <Services />
          <Process />
          <WhyUs />
          <Pricing />
          <FAQ />
          <ContactForm />
          <Footer />
        </>
      ) : (
        <IndexV2 />
      )}
    </div>
  );
};

export default Index;
