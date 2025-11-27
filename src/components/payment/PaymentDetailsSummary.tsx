import { Separator } from "@/components/ui/separator";

interface TrackingService {
  id: string;
  service_type: string;
  price: number; // Prix HT
}

interface PaymentDetailsSummaryProps {
  demarcheType: string;
  fraisDossier: number; // Prix HT
  montantTtc: number;
  trackingServices: TrackingService[];
  actionRapideTitre?: string;
}

const SERVICE_LABELS: Record<string, string> = {
  dossier_prioritaire: "Dossier prioritaire",
  certificat_non_gage: "Certificat de non-gage",
  suivi_email: "Suivi par email",
  suivi_sms: "Suivi par SMS",
  suivi_complet: "Suivi complet",
};

/**
 * Règles TVA simplifiées :
 * - TVA 20% sur TOUT sauf la carte grise (taxe régionale)
 * - Carte grise = exonérée TVA (HT = TTC)
 * - Services = prix HT + TVA 20%
 */
export const PaymentDetailsSummary = ({
  demarcheType,
  fraisDossier,
  montantTtc,
  trackingServices,
  actionRapideTitre,
}: PaymentDetailsSummaryProps) => {
  // Calcul des totaux - tous les prix en HT
  const totalOptionsHT = trackingServices.reduce((sum, s) => sum + (s.price || 0), 0);
  
  if (demarcheType === "CG") {
    // Pour CG : TVA uniquement sur les services, pas sur la taxe régionale
    // Calcul: Total TTC = prix carte grise + services HT + TVA (20% sur services)
    const servicesHT = fraisDossier + totalOptionsHT;
    const servicesTVA = servicesHT * 0.20;
    // Prix carte grise = ce qui reste après avoir enlevé les services + TVA
    // Ne peut pas être négatif
    const prixCarteGrise = Math.max(0, montantTtc - servicesHT - servicesTVA);
    // Total TTC = TOUJOURS au moins (services HT + TVA)
    const totalTTC = prixCarteGrise + servicesHT + servicesTVA;

    return (
      <div className="space-y-4">
        {/* Bloc 1 : Carte grise (SANS TVA) */}
        {prixCarteGrise > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Carte grise
            </p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Taxe régionale</span>
              <div className="text-right">
                <span className="font-medium">{prixCarteGrise.toFixed(2)} €</span>
                <span className="text-xs text-muted-foreground ml-1">(exonéré TVA)</span>
              </div>
            </div>
          </div>
        )}

        {(prixCarteGrise > 0 && servicesHT > 0) && <Separator />}

        {/* Bloc 2 : Services (HT - TVA 20% appliquée à la fin) */}
        {servicesHT > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Services (HT)
            </p>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Frais de dossier</span>
              <span>{fraisDossier.toFixed(2)} €</span>
            </div>

            {trackingServices.map((service) => (
              <div key={service.id} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {SERVICE_LABELS[service.service_type] || service.service_type}
                </span>
                <span>{service.price.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Bloc 3 : TVA et totaux */}
        <div className="space-y-2">
          {servicesHT > 0 && (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total HT (services)</span>
                <span>{servicesHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">TVA (20%)</span>
                <span>{servicesTVA.toFixed(2)} €</span>
              </div>
              <Separator className="my-2" />
            </>
          )}
          <div className="flex justify-between items-center font-semibold">
            <span>Total TTC</span>
            <span className="text-lg text-primary">{totalTTC.toFixed(2)} €</span>
          </div>
        </div>
      </div>
    );
  }

  // Pour les autres types (DA, DC, etc.) : TVA 20% sur tout
  // Tous les prix sont stockés en HT dans la DB
  const servicesHT = fraisDossier + totalOptionsHT;
  const servicesTVA = servicesHT * 0.20;
  const totalTTC = servicesHT + servicesTVA;

  return (
    <div className="space-y-4">
      {/* Services (HT - TVA 20% appliquée à la fin) */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Services (HT)
        </p>
        
        {actionRapideTitre && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{actionRapideTitre}</span>
            <span>{fraisDossier.toFixed(2)} €</span>
          </div>
        )}

        {trackingServices.map((service) => (
          <div key={service.id} className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              {SERVICE_LABELS[service.service_type] || service.service_type}
            </span>
            <span>{service.price.toFixed(2)} €</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* TVA et totaux */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Total HT</span>
          <span>{servicesHT.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">TVA (20%)</span>
          <span>{servicesTVA.toFixed(2)} €</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between items-center font-semibold">
          <span>Total TTC</span>
          <span className="text-lg text-primary">{totalTTC.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
};
