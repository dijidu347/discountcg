import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Receipt } from "lucide-react";

interface GuestPaymentDetailsSummaryProps {
  prixCarteGrise: number;
  fraisDossier: number;
  smsNotifications?: boolean;
  emailNotifications?: boolean;
}

export const GuestPaymentDetailsSummary = ({
  prixCarteGrise,
  fraisDossier,
  smsNotifications = false,
  emailNotifications = false,
}: GuestPaymentDetailsSummaryProps) => {
  // Options pricing
  const smsPrix = smsNotifications ? 5 : 0;
  
  // Total services HT (frais dossier + options - tout soumis à TVA 20%)
  const totalServicesHT = fraisDossier + smsPrix;
  
  // TVA 20% sur les services uniquement
  const tva = totalServicesHT * 0.20;
  
  // Total TTC = carte grise (exonérée) + services HT + TVA
  const totalTTC = prixCarteGrise + totalServicesHT + tva;

  return (
    <Card className="border-2 border-primary">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Récapitulatif des frais
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Section Carte Grise (exonérée TVA) */}
        {prixCarteGrise > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Carte grise (exonérée TVA)
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm">Taxe régionale</span>
              <span className="font-medium">{prixCarteGrise.toFixed(2)} €</span>
            </div>
          </div>
        )}

        {/* Section Services (soumis à TVA) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Services (HT)
          </p>
          
          {/* Frais de dossier */}
          <div className="flex justify-between items-center">
            <span className="text-sm">Frais de dossier</span>
            <span className="font-medium">{fraisDossier.toFixed(2)} €</span>
          </div>

          {/* Options */}
          {smsNotifications && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Suivi par SMS</span>
              <span className="font-medium">5.00 €</span>
            </div>
          )}
          
          {emailNotifications && (
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="text-sm">Suivi par email</span>
              <span className="text-sm">Gratuit</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Section Totaux */}
        <div className="space-y-2">
          {/* Récap carte grise si applicable */}
          {prixCarteGrise > 0 && (
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Carte grise (exonérée TVA)</span>
              <span>{prixCarteGrise.toFixed(2)} €</span>
            </div>
          )}
          
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
      </CardContent>
    </Card>
  );
};

export const calculateGuestOrderTTC = (
  prixCarteGrise: number,
  fraisDossier: number,
  smsNotifications: boolean = false
): number => {
  const smsPrix = smsNotifications ? 5 : 0;
  const totalServicesHT = fraisDossier + smsPrix;
  const tva = totalServicesHT * 0.20;
  return prixCarteGrise + totalServicesHT + tva;
};
