import { Shield, Clock } from "lucide-react";
import { SimulateurSection } from "@/components/SimulateurSection";

const Hero = () => {
  return <section className="relative pt-16 overflow-hidden">
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
                Carte grise en ligne<br />
                <span className="text-primary-foreground/90">rapide, sécurisée et pas chère</span>
              </h1>

              <p className="text-lg md:text-xl mb-8 opacity-90">
                Faites votre carte grise en ligne pas chère — service habilité par l'État, traitement sous 24h. Frais de dossier dès 30€.
              </p>

              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-full border border-primary-foreground/20">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">Service Agréé</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-full border border-primary-foreground/20">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">24h Max</span>
                </div>
              </div>
            </div>

            {/* Simulateur */}
            <div>
              <SimulateurSection embedded />
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;