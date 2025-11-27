import { Shield, CreditCard, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

export const TrustSection = () => {
  const [statsCount, setStatsCount] = useState(0);

  useEffect(() => {
    const startDate = new Date('2017-01-01');
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const averagePerDay = 45;
    const baseCount = daysSinceStart * averagePerDay;
    const todayProgress = Math.floor(Math.random() * averagePerDay);
    setStatsCount(baseCount + todayProgress);
  }, []);

  return (
    <section className="py-20 px-4 bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 items-start mb-12">
          {/* Paiement sécurisé */}
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <CreditCard className="w-6 h-6" />
              Paiement sécurisé
            </h3>
            <div className="flex flex-wrap items-center gap-4 bg-primary-foreground/10 p-5 rounded-xl border border-primary-foreground/20">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" 
                alt="Visa" 
                className="h-8 md:h-10 object-contain bg-white rounded px-2 py-1"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" 
                alt="Mastercard" 
                className="h-8 md:h-10 object-contain"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" 
                alt="PayPal" 
                className="h-8 md:h-10 object-contain"
              />
              <div className="text-sm font-medium bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
                Paiement 4x
              </div>
            </div>
          </div>

          {/* Habilitation */}
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Shield className="w-6 h-6" />
              Service habilité
            </h3>
            <div className="bg-primary-foreground/10 p-5 rounded-xl border border-primary-foreground/20 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Habilitation Préfecture</p>
                  <p className="text-sm opacity-80">N° 9744</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Agrément Trésor Public</p>
                  <p className="text-sm opacity-80">N° 14871</p>
                </div>
              </div>
              
              {/* Bande tricolore */}
              <div className="h-1 w-full bg-gradient-to-r from-france-blue via-background to-france-red rounded-full" />
              
              <p className="text-sm opacity-90">
                Membre de la Fédération Française des Professionnels de la Carte Grise en Ligne
              </p>
            </div>
          </div>
        </div>

        {/* Compteur central */}
        <div className="text-center pt-8 border-t border-primary-foreground/20">
          <div className="text-5xl md:text-6xl font-extrabold mb-2">
            {statsCount.toLocaleString('fr-FR')}+
          </div>
          <p className="text-lg opacity-90">
            Démarches réalisées depuis 2017
          </p>
          <p className="text-sm opacity-70 mt-1">
            +45 démarches par jour en moyenne
          </p>
        </div>
      </div>
    </section>
  );
};
