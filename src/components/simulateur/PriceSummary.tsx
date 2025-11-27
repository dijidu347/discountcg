import { Card, CardContent } from "@/components/ui/card";
import { PriceCalculation } from "@/utils/calculatePrice";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Car } from "lucide-react";

interface VehicleInfo {
  marque?: string;
  modele?: string;
  energie?: string;
  date_mec?: string;
}

interface PriceSummaryProps {
  calculation: PriceCalculation;
  departement: string;
  vehicleInfo?: VehicleInfo;
  fraisDossier?: number;
  selectedOptions?: {
    smsNotifications: boolean;
    emailNotifications: boolean;
    packNotifications?: boolean;
  };
}

export const PriceSummary = ({ 
  calculation, 
  departement, 
  vehicleInfo,
  fraisDossier = 30,
  selectedOptions
}: PriceSummaryProps) => {
  // Prix des options
  const emailPrix = 5;
  const smsPrix = 8;
  const packPrix = 19;

  // Calcul TVA comme pour les garages
  const prixCarteGrise = calculation.prixTotal;
  let optionsPrix = 0;
  if (selectedOptions?.packNotifications) {
    optionsPrix = packPrix;
  } else {
    if (selectedOptions?.emailNotifications) optionsPrix += emailPrix;
    if (selectedOptions?.smsNotifications) optionsPrix += smsPrix;
  }
  const totalServicesHT = fraisDossier + optionsPrix;
  const tva = totalServicesHT * 0.20;
  const totalTTC = prixCarteGrise + totalServicesHT + tva;

  return (
    <Card className="border-primary/20 sticky top-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Vehicle Info */}
          {vehicleInfo && (vehicleInfo.marque || vehicleInfo.modele) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Car className="w-5 h-5" />
                <span className="font-semibold">Votre véhicule</span>
              </div>
              <div className="space-y-2 text-sm">
                {vehicleInfo.marque && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marque</span>
                    <span className="font-medium">{vehicleInfo.marque}</span>
                  </div>
                )}
                {vehicleInfo.modele && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modèle</span>
                    <span className="font-medium">{vehicleInfo.modele}</span>
                  </div>
                )}
                {vehicleInfo.energie && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Énergie</span>
                    <span className="font-medium">{vehicleInfo.energie}</span>
                  </div>
                )}
                {vehicleInfo.date_mec && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mise en circulation</span>
                    <span className="font-medium">{vehicleInfo.date_mec}</span>
                  </div>
                )}
              </div>
              <Separator />
            </div>
          )}

          {/* Prix Carte Grise (exonérée TVA) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Carte grise (exonérée TVA)
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm">Taxe régionale</span>
              <span className="font-medium">{prixCarteGrise.toFixed(2)} €</span>
            </div>
          </div>

          {/* Services (soumis à TVA) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Services (HT)
            </p>
            <div className="flex justify-between items-center text-sm">
              <span>Frais de dossier</span>
              <span className="font-medium">{fraisDossier.toFixed(2)} €</span>
            </div>
            {selectedOptions?.packNotifications && (
              <div className="flex justify-between items-center text-sm">
                <span>Pack Suivi Complet</span>
                <span className="font-medium">{packPrix.toFixed(2)} €</span>
              </div>
            )}
            {!selectedOptions?.packNotifications && selectedOptions?.emailNotifications && (
              <div className="flex justify-between items-center text-sm">
                <span>Suivi par email</span>
                <span className="font-medium">{emailPrix.toFixed(2)} €</span>
              </div>
            )}
            {!selectedOptions?.packNotifications && selectedOptions?.smsNotifications && (
              <div className="flex justify-between items-center text-sm">
                <span>Suivi par SMS</span>
                <span className="font-medium">{smsPrix.toFixed(2)} €</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Totaux */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Carte grise (exonérée)</span>
              <span>{prixCarteGrise.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Total HT (services)</span>
              <span>{totalServicesHT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>TVA (20%)</span>
              <span>{tva.toFixed(2)} €</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-xl font-bold pt-2">
              <span>Total TTC</span>
              <span className="text-primary">{totalTTC.toFixed(2)} €</span>
            </div>
          </div>

          {calculation.abattement && (
            <Badge variant="secondary" className="w-full justify-center py-2 text-xs">
              👉 Abattement -50% appliqué
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
