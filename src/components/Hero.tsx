import { Shield, Award, Clock, Star, Flag, CheckCircle, Lock, Zap } from "lucide-react";
import { PriceSimulator } from "@/components/PriceSimulator";
import { StatsCounter } from "@/components/StatsCounter";
const Hero = () => {
  return <section className="relative min-h-screen pt-16 pb-16 overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Bande tricolore française */}
      <div className="absolute top-16 left-0 right-0 h-1.5 flex z-20">
        <div className="flex-1 bg-gradient-to-r from-france-blue to-france-blue" />
        <div className="flex-1 bg-background" />
        <div className="flex-1 bg-gradient-to-l from-france-red to-france-red" />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-8">
        {/* En-tête principale */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-3 mb-2">
            <Flag className="w-12 h-12 text-primary" />
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Nom à trouver    
            </h1>
          </div>
          
          <p className="text-2xl md:text-3xl font-bold text-primary">
            Carte Grise Simplifiée
          </p>
          
          <div className="flex items-center justify-center gap-8 mt-6 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">Service Agréé État</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full border border-success/20">
              <Award className="w-5 h-5 text-success" />
              <span className="text-sm font-semibold text-success">Depuis 2017</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
              <Clock className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-accent">Traitement 24h</span>
            </div>
          </div>
        </div>

        {/* Grille principale améliorée */}
        <div className="max-w-7xl mx-auto">
          {/* Simulateur principal */}
          <div className="mb-8">
            <PriceSimulator />
          </div>

          {/* Grille stats + Google */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <StatsCounter />
            
            {/* Carte Google My Business mise en avant */}
            <a href="https://www.google.fr/search?sca_esv=a73f109bbcae9216&sxsrf=AE3TifMH8hCDAbm_y2mEw-YvpIEG7jzcdg:1763372759531&kgmid=/g/11w9zk40cx&q=Garage+Jimmy+2x" target="_blank" rel="noopener noreferrer" className="group relative bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 transition-all duration-300 rounded-2xl p-8 shadow-2xl border-2 border-primary/30 hover:border-primary hover:scale-[1.02] overflow-hidden">
              {/* Effet de brillance au survol */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-3xl shadow-lg">
                    G
                  </div>
                  <div>
                    <p className="font-bold text-2xl text-foreground">Garage Jimmy 2x</p>
                    <p className="text-sm text-muted-foreground">Google My Business</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-accent text-accent" />)}
                  <span className="text-xl font-bold text-foreground ml-2">5.0</span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6">
                  Des centaines de clients satisfaits nous font confiance
                </p>
                
                <div className="flex items-center gap-3 text-primary group-hover:text-primary/80 transition-colors">
                  <span className="font-semibold text-lg">Voir tous nos avis</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>
          </div>

          {/* Badges de confiance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl p-6 shadow-lg border border-border hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-center text-primary">100% Légal</h3>
              <p className="text-sm text-muted-foreground text-center">
                Service habilité par le Ministère de l'Intérieur
              </p>
            </div>
            
            <div className="bg-card rounded-xl p-6 shadow-lg border border-border hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-center text-primary">Paiement Sécurisé</h3>
              <p className="text-sm text-muted-foreground text-center">
                Transaction cryptée et 100% sécurisée
              </p>
            </div>
            
            <div className="bg-card rounded-xl p-6 shadow-lg border border-border hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-center text-primary">Service Rapide</h3>
              <p className="text-sm text-muted-foreground text-center">
                Traitement de votre dossier en moins de 24h
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;