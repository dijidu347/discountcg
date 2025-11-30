import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";

// Types pour les services de suivi
export interface TrackingService {
  id: string;
  service_type: string;
  price: number;
}

// Labels pour les types de services
export const SERVICE_LABELS: Record<string, string> = {
  priority: "Dossier prioritaire",
  non_gage: "Certificat de non-gage",
  email: "Suivi email",
  sms: "Suivi SMS",
  complete: "Suivi complet",
};

interface PaymentDetailsSummaryProps {
  demarcheType: string;
  fraisDossier: number;           // Prix des frais de dossier (prix de l'action)
  montantTtc: number;             // Montant total stocké en BD (fallback)
  trackingServices: TrackingService[];
  actionRapideTitre?: string;
  prixCarteGrise?: number;        // Prix carte grise (taxe régionale)
  onCalculated?: (result: PaymentCalculationResult) => void;
}

export interface PaymentCalculationResult {
  prixCarteGrise: number;
  fraisDossier: number;
  optionsTotal: number;
  totalServicesHT: number;
  tva: number;
  totalTTC: number;
}

/**
 * Composant d'affichage du récapitulatif de paiement
 * 
 * RÈGLES D'AFFICHAGE (TVA désactivée) :
 * 1. Chaque ligne est affichée séparément (pas d'addition dans cette zone)
 * 2. Carte grise = taxe régionale
 * 3. Services = prix uniquement
 * 4. Total = somme de tout
 */
export const PaymentDetailsSummary = ({
  demarcheType,
  fraisDossier,
  montantTtc,
  trackingServices,
  actionRapideTitre,
  prixCarteGrise: prixCarteGriseProp,
  onCalculated,
}: PaymentDetailsSummaryProps) => {
  // Détermine si c'est une démarche Carte Grise
  const isCG = demarcheType === "CG" || demarcheType === "CG_DA" || demarcheType === "CG_IMPORT";

  // Prix carte grise (taxe régionale) - passé en prop ou 0 pour non-CG
  const prixCarteGrise = isCG ? (prixCarteGriseProp || 0) : 0;
  
  // Frais de dossier (prix de l'action)
  const fraisDossierHT = fraisDossier || 0;
  
  // Options
  const optionsTotal = trackingServices.reduce((sum, s) => sum + s.price, 0);
  
  // Total services
  const totalServicesHT = fraisDossierHT + optionsTotal;
  
  // Pas de TVA
  const tva = 0;
  
  // Total = carte grise + services (pas de TVA)
  const totalTTC = prixCarteGrise + totalServicesHT;

  // Créer le résultat du calcul
  const result: PaymentCalculationResult = {
    prixCarteGrise,
    fraisDossier: fraisDossierHT,
    optionsTotal,
    totalServicesHT,
    tva,
    totalTTC,
  };

  // Notifier le parent du calcul si callback fourni
  if (onCalculated) {
    onCalculated(result);
  }

  // ==============================
  // AFFICHAGE POUR CARTE GRISE
  // ==============================
  if (isCG) {
    return (
      <div className="space-y-4">
        {/* BLOC 1 : Carte grise */}
        {prixCarteGrise > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Carte grise
            </p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Taxe régionale</span>
              <div className="text-right">
                <span className="font-medium">{formatPrice(prixCarteGrise)} €</span>
              </div>
            </div>
          </div>
        )}

        {(prixCarteGrise > 0 && totalServicesHT > 0) && <Separator />}

        {/* BLOC 2 : Services - chaque ligne séparément */}
        {totalServicesHT > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Services
            </p>

            {/* Frais de dossier */}
            {fraisDossierHT > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Frais de dossier</span>
                <span>{formatPrice(fraisDossierHT)} €</span>
              </div>
            )}

            {/* Options - chacune sur sa propre ligne */}
            {trackingServices.map((service) => (
              <div key={service.id} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {SERVICE_LABELS[service.service_type] || service.service_type}
                </span>
                <span>{formatPrice(service.price)} €</span>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* BLOC 3 : Totaux */}
        <div className="space-y-2">
          {totalServicesHT > 0 && (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total services</span>
                <span>{formatPrice(totalServicesHT)} €</span>
              </div>
              <Separator className="my-2" />
            </>
          )}
          <div className="flex justify-between items-center font-semibold">
            <span>Total</span>
            <span className="text-lg text-primary">{formatPrice(totalTTC)} €</span>
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // AFFICHAGE POUR NON CARTE GRISE (DA, DC, etc.)
  // ==============================
  return (
    <div className="space-y-4">
      {/* Services - chaque ligne séparément */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Services
        </p>

        {/* Frais de dossier / Action rapide */}
        {fraisDossierHT > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              {actionRapideTitre || "Frais de dossier"}
            </span>
            <span>{formatPrice(fraisDossierHT)} €</span>
          </div>
        )}

        {/* Options - chacune sur sa propre ligne */}
        {trackingServices.map((service) => (
          <div key={service.id} className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              {SERVICE_LABELS[service.service_type] || service.service_type}
            </span>
            <span>{formatPrice(service.price)} €</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Totaux */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Total</span>
          <span>{formatPrice(totalServicesHT)} €</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between items-center font-semibold">
          <span>Total à payer</span>
          <span className="text-lg text-primary">{formatPrice(totalTTC)} €</span>
        </div>
      </div>
    </div>
  );
};