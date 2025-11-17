import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const competitors = [
  {
    name: "Garage Jimmy 2x",
    isUs: true,
    features: {
      price: "30€",
      processing: "24h",
      support: "Personnalisé",
      garantie: "Satisfait ou remboursé",
      documents: "Aide gratuite",
      track: "Suivi en temps réel",
    }
  },
  {
    name: "Concurrent A",
    isUs: false,
    features: {
      price: "45€",
      processing: "48-72h",
      support: "Email uniquement",
      garantie: "Non",
      documents: "Payant (+15€)",
      track: "Non",
    }
  },
  {
    name: "Concurrent B",
    isUs: false,
    features: {
      price: "39€",
      processing: "48h",
      support: "Standard",
      garantie: "Limitée",
      documents: "Aide basique",
      track: "Basique",
    }
  }
];

const featureLabels = {
  price: "Frais de dossier",
  processing: "Délai de traitement",
  support: "Support client",
  garantie: "Garantie",
  documents: "Aide documents",
  track: "Suivi dossier",
};

export const PriceComparator = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-primary mb-4">
            Pourquoi choisir Garage Jimmy 2x ?
          </h2>
          <p className="text-xl text-muted-foreground">
            Comparez notre service avec la concurrence
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {competitors.map((competitor, idx) => (
              <Card
                key={idx}
                className={`relative overflow-hidden transition-all duration-300 ${
                  competitor.isUs
                    ? "border-4 border-primary shadow-2xl scale-105 md:scale-110 z-10"
                    : "border-2 border-border hover:shadow-lg"
                }`}
              >
                {competitor.isUs && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-accent text-primary-foreground text-center py-2 font-bold text-sm">
                    ⭐ MEILLEUR CHOIX ⭐
                  </div>
                )}
                
                <CardHeader className={competitor.isUs ? "pt-12" : ""}>
                  <CardTitle className={`text-2xl text-center ${
                    competitor.isUs ? "text-primary" : "text-foreground"
                  }`}>
                    {competitor.name}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {Object.entries(featureLabels).map(([key, label]) => (
                    <div key={key} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          {label}
                        </p>
                        <p className={`font-bold ${
                          competitor.isUs ? "text-primary text-lg" : "text-foreground"
                        }`}>
                          {competitor.features[key as keyof typeof competitor.features]}
                        </p>
                      </div>
                      {competitor.isUs ? (
                        <Check className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                      ) : key === "price" && parseFloat(competitor.features[key]) > 30 ? (
                        <X className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-lg font-semibold text-muted-foreground mb-4">
              + Prix de la carte grise variable selon votre véhicule et région
            </p>
            <p className="text-sm text-muted-foreground">
              Tous nos prix sont transparents et affichés dès le départ, sans frais cachés
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
