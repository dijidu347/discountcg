import { Shield, Award, Clock } from "lucide-react";
import { PriceSimulator } from "@/components/PriceSimulator";
import { StatsCounter } from "@/components/StatsCounter";

const Hero = () => {
  return (
    <section className="relative min-h-screen pt-20 pb-16 overflow-hidden">
      {/* Bande tricolore en haut */}
      <div className="absolute top-16 left-0 right-0 h-2 bg-gradient-to-r from-primary via-background to-accent z-20" />
      
      {/* Background avec motif subtil */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--primary) / 0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* En-tête avec drapeaux */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl">🇫🇷</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary">
              Garage Jimmy 2x
            </h1>
            <span className="text-4xl">🇫🇷</span>
          </div>
          <p className="text-xl text-muted-foreground font-medium">
            Service Agréé & Certifié par l'État Français
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Shield className="w-5 h-5" />
              <span>100% Légal</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Award className="w-5 h-5" />
              <span>Depuis 2017</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Clock className="w-5 h-5" />
              <span>Traitement 24h</span>
            </div>
          </div>
        </div>

        {/* Grille principale */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Simulateur (2 colonnes) */}
          <div className="lg:col-span-2">
            <PriceSimulator />
          </div>

          {/* Stats et infos (1 colonne) */}
          <div className="space-y-6">
            <StatsCounter />
            
            {/* Badge de confiance */}
            <div className="bg-card rounded-lg p-6 shadow-lg border-2 border-primary/20">
              <h3 className="font-bold text-lg mb-4 text-center text-primary">
                Pourquoi nous choisir ?
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-accent text-lg">✓</span>
                  <span>Service 100% en ligne, rapide et sécurisé</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent text-lg">✓</span>
                  <span>Équipe expérimentée depuis 2017</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent text-lg">✓</span>
                  <span>Prix transparents, sans frais cachés</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent text-lg">✓</span>
                  <span>Accompagnement personnalisé</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent text-lg">✓</span>
                  <span>Paiement sécurisé</span>
                </li>
              </ul>
            </div>

            {/* Google My Business */}
            <a
              href="https://www.google.fr/search?sca_esv=a73f109bbcae9216&sxsrf=AE3TifMH8hCDAbm_y2mEw-YvpIEG7jzcdg:1763372759531&kgmid=/g/11w9zk40cx&q=Garage+Jimmy+2x"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-card hover:bg-card/80 transition-colors rounded-lg p-4 shadow-lg border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">⭐</div>
                <div>
                  <p className="font-semibold text-sm">Voir nos avis Google</p>
                  <p className="text-xs text-muted-foreground">Garage Jimmy 2x - Avis clients</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Bande de confiance officielle */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-4 bg-primary/10 px-8 py-4 rounded-full border-2 border-primary/20">
            <span className="text-2xl">🏛️</span>
            <p className="text-sm font-semibold text-primary">
              Habilité par le Ministère de l'Intérieur
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
