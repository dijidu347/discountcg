import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Receipt } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface GuestPaymentDetailsSummaryProps {
  prixCarteGrise: number;
  fraisDossier: number;
  smsNotifications?: boolean;
  emailNotifications?: boolean;
  dossierPrioritaire?: boolean;
  certificatNonGage?: boolean;
}

export const GuestPaymentDetailsSummary = ({
  prixCarteGrise,
  fraisDossier,
  smsNotifications = false,
  emailNotifications = false,
  dossierPrioritaire = false,
  certificatNonGage = false,
}: GuestPaymentDetailsSummaryProps) => {
  // Options pricing
  const smsPrix = smsNotifications ? 5 : 0;
  const emailPrix = emailNotifications ? 5 : 0;
  const prioritairePrix = dossierPrioritaire ? 5 : 0;
  const nonGagePrix = certificatNonGage ? 10 : 0;

  // Total services HT (frais dossier + toutes les options)
  const totalServicesHT = fraisDossier + smsPrix + emailPrix + prioritairePrix + nonGagePrix;

  // Total = carte grise + services HT (pas de TVA)
  const total = prixCarteGrise + totalServicesHT;

  return (
    <Card className="border-2 border-primary">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Récapitulatif des frais
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Section Carte Grise */}
        {prixCarteGrise > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Carte grise
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm">Taxe régionale</span>
              <span className="font-medium">{formatPrice(prixCarteGrise)} €</span>
            </div>
          </div>
        )}

        {/* Section Services */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Services
          </p>
          
          {/* Frais de dossier */}
          <div className="flex justify-between items-center">
            <span className="text-sm">Frais de dossier</span>
            <span className="font-medium">{formatPrice(fraisDossier)} €</span>
          </div>

          {/* Options */}
          {dossierPrioritaire && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Dossier prioritaire</span>
              <span className="font-medium">5.00 €</span>
            </div>
          )}
          {certificatNonGage && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Certificat de non-gage</span>
              <span className="font-medium">10.00 €</span>
            </div>
          )}
          {emailNotifications && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Suivi par email</span>
              <span className="font-medium">5.00 €</span>
            </div>
          )}
          {smsNotifications && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Suivi par SMS</span>
              <span className="font-medium">5.00 €</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Section Totaux */}
        <div className="space-y-2">
          {/* Récap carte grise si applicable */}
          {prixCarteGrise > 0 && (
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Carte grise</span>
              <span>{formatPrice(prixCarteGrise)} €</span>
            </div>
          )}
          
          <div className="flex justify-between items-center text-sm">
            <span>Total services</span>
            <span>{formatPrice(totalServicesHT)} €</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center text-xl font-bold pt-2">
            <span>Total</span>
            <span className="text-primary">{formatPrice(total)} €</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const calculateGuestOrderTTC = (
  prixCarteGrise: number,
  fraisDossier: number,
  options: {
    smsNotifications?: boolean;
    emailNotifications?: boolean;
    dossierPrioritaire?: boolean;
    certificatNonGage?: boolean;
  } = {}
): number => {
  const smsPrix = options.smsNotifications ? 5 : 0;
  const emailPrix = options.emailNotifications ? 5 : 0;
  const prioritairePrix = options.dossierPrioritaire ? 5 : 0;
  const nonGagePrix = options.certificatNonGage ? 10 : 0;
  const totalServicesHT = fraisDossier + smsPrix + emailPrix + prioritairePrix + nonGagePrix;
  // Pas de TVA - total = carte grise + services
  return prixCarteGrise + totalServicesHT;
};