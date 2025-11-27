import { Shield, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const scrollToSimulator = () => {
    const element = document.getElementById("simulateur");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative pt-16 overflow-hidden">
      {/* Bande tricolore */}
      <div className="absolute top-16 left-0 right-0 h-1 flex z-20">
        <div className="flex-1 bg-france-blue" />
        <div className="flex-1 bg-background" />
        <div className="flex-1 bg-france-red" />
      </div>

      {/* Hero principal */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            {/* Contenu texte */}
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
                Carte grise en ligne<br/>
                <span className="text-primary-foreground/90">rapide et sécurisée</span>
              </h1>
              
              <p className="text-lg md:text-xl mb-8 opacity-90">
                Service habilité par l'État – traitement sous 24h maximum
              </p>

              <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-full border border-primary-foreground/20">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">Service Agréé</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-full border border-primary-foreground/20">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">24h Max</span>
                </div>
              </div>

              <Button 
                onClick={scrollToSimulator}
                size="lg"
                className="bg-background text-primary hover:bg-background/90 font-semibold py-6 px-10 rounded-2xl text-lg"
              >
                Simuler mon tarif
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Image carte grise */}
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src="/lovable-uploads/cde191fb-e77f-4260-bde8-152e023920a5.jpg" 
                  alt="Carte grise française"
                  className="rounded-3xl shadow-2xl w-full max-w-md border-4 border-primary-foreground/20"
                />
                <div className="absolute -bottom-4 -right-4 bg-background text-foreground px-4 py-2 rounded-xl shadow-lg">
                  <div className="text-sm font-bold text-primary">100% en ligne</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
