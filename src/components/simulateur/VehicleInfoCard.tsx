import { Card, CardContent } from "@/components/ui/card";
import { Car } from "lucide-react";

export interface VehicleInfoSummary {
  marque?: string;
  modele?: string;
  energie?: string;
  date_mec?: string;
}

interface VehicleInfoCardProps {
  vehicleInfo?: VehicleInfoSummary;
}

// Récapitulatif du véhicule identifié à partir de la plaque. Extrait du
// récapitulatif de prix pour pouvoir être placé dans le fil des étapes : dans la
// colonne de droite, il se retrouvait tout en bas de page sur mobile, une fois
// la colonne repliée sous le reste.
export const VehicleInfoCard = ({ vehicleInfo }: VehicleInfoCardProps) => {
  if (!vehicleInfo || (!vehicleInfo.marque && !vehicleInfo.modele)) return null;

  const lignes: Array<[string, string | undefined]> = [
    ["Marque", vehicleInfo.marque],
    ["Modèle", vehicleInfo.modele],
    ["Énergie", vehicleInfo.energie],
    ["Mise en circulation", vehicleInfo.date_mec],
  ];

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Car className="w-5 h-5" />
          <span className="font-semibold">Votre véhicule</span>
        </div>
        <div className="space-y-2 text-sm">
          {lignes.map(([libelle, valeur]) =>
            valeur ? (
              <div key={libelle} className="flex justify-between">
                <span className="text-muted-foreground">{libelle}</span>
                <span className="font-medium">{valeur}</span>
              </div>
            ) : null,
          )}
        </div>
      </CardContent>
    </Card>
  );
};
