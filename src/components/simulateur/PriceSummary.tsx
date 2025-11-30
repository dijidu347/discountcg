import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PriceCalculation } from "@/utils/calculatePrice";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Car, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatPrice } from "@/lib/utils";

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
    dossierPrioritaire?: boolean;
    certificatNonGage?: boolean;
  };
  isPaid?: boolean;
}

export const PriceSummary = ({ 
  calculation, 
  departement, 
  vehicleInfo,
  fraisDossier = 30,
  selectedOptions,
  isPaid = false
}: PriceSummaryProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Prix des options
  const emailPrix = 5;
  const smsPrix = 8;
  const packPrix = 10;
  const dossierPrioritairePrix = 5;
  const certificatNonGagePrix = 10;

  // Calcul sans TVA
  const prixCarteGrise = calculation.prixTotal;
  let optionsPrix = 0;
  if (selectedOptions?.packNotifications) {
    optionsPrix = packPrix;
  } else {
    if (selectedOptions?.emailNotifications) optionsPrix += emailPrix;
    if (selectedOptions?.smsNotifications) optionsPrix += smsPrix;
  }
  if (selectedOptions?.dossierPrioritaire) optionsPrix += dossierPrioritairePrix;
  if (selectedOptions?.certificatNonGage) optionsPrix += certificatNonGagePrix;
  
  const totalServices = fraisDossier + optionsPrix;
  // Pas de TVA - total = carte grise + services
  const total = prixCarteGrise + totalServices;

  // Si payé, ne pas afficher le bloc prix
  if (isPaid) {
    return null;
  }

  return (
    <Card className="border-primary/20 sticky top-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Vehicle Info - Always visible */}
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

          {/* Total - Visible only when collapsed */}
          {!isOpen && (
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)} €</span>
            </div>
          )}

          {!isOpen && calculation.abattement && (
            <Badge variant="secondary" className="w-full justify-center py-2 text-xs">
              👉 Abattement -50% appliqué
            </Badge>
          )}

          {/* Collapsible details */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full text-sm text-primary hover:text-primary/80 transition-colors py-2">
              {isOpen ? (
                <>
                  <span>Masquer les détails</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Voir les détails</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <Separator />
              
              {/* Prix Carte Grise */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Carte grise
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Taxe régionale</span>
                  <span className="font-medium">{formatPrice(prixCarteGrise)} €</span>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Services
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span>Frais de dossier</span>
                  <span className="font-medium">{formatPrice(fraisDossier)} €</span>
                </div>
                {selectedOptions?.dossierPrioritaire && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Dossier Prioritaire</span>
                    <span className="font-medium">{formatPrice(dossierPrioritairePrix)} €</span>
                  </div>
                )}
                {selectedOptions?.certificatNonGage && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Certificat de non-gage</span>
                    <span className="font-medium">{formatPrice(certificatNonGagePrix)} €</span>
                  </div>
                )}
                {selectedOptions?.packNotifications && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Pack Suivi Complet</span>
                    <span className="font-medium">{formatPrice(packPrix)} €</span>
                  </div>
                )}
                {!selectedOptions?.packNotifications && selectedOptions?.emailNotifications && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Suivi par email</span>
                    <span className="font-medium">{formatPrice(emailPrix)} €</span>
                  </div>
                )}
                {!selectedOptions?.packNotifications && selectedOptions?.smsNotifications && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Suivi par SMS</span>
                    <span className="font-medium">{formatPrice(smsPrix)} €</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Totaux */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Carte grise</span>
                  <span>{formatPrice(prixCarteGrise)} €</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Total services</span>
                  <span>{formatPrice(totalServices)} €</span>
                </div>
              </div>

              <Separator />

              {/* Total - At bottom when expanded */}
              <div className="flex justify-between items-center text-xl font-bold pt-2">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)} €</span>
              </div>

              {calculation.abattement && (
                <Badge variant="secondary" className="w-full justify-center py-2 text-xs">
                  👉 Abattement -50% appliqué
                </Badge>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};