import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export const StatsCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Calculer le nombre de cartes grises depuis 2017
    const startDate = new Date(2017, 0, 1);
    const today = new Date();
    const daysSince2017 = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Base: 45 cartes grises par jour en moyenne
    const baseCount = daysSince2017 * 45;
    
    // Ajouter un nombre aléatoire pour le jour actuel (0-50)
    const todayProgress = Math.floor(Math.random() * 50);
    
    const finalCount = baseCount + todayProgress;
    
    // Animation du compteur
    let current = 0;
    const increment = Math.ceil(finalCount / 50);
    const timer = setInterval(() => {
      current += increment;
      if (current >= finalCount) {
        setCount(finalCount);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg p-8 shadow-lg border-2 border-primary-foreground/20">
      <div className="flex items-center justify-center gap-4 mb-4">
        <CheckCircle2 className="w-12 h-12" />
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wide opacity-90">
            Depuis 2017
          </p>
          <p className="text-5xl font-bold tabular-nums">
            {count.toLocaleString('fr-FR')}
          </p>
          <p className="text-lg font-semibold mt-2">
            Cartes grises réalisées
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-primary-foreground/20 text-center">
        <p className="text-sm opacity-90">
          ⭐ Service de confiance ⭐
        </p>
      </div>
    </div>
  );
};
