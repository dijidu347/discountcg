import { Separator } from "@/components/ui/separator";

interface TrackingService {
  id: string;
  service_type: string;
  price: number;
}

interface PaymentDetailsSummaryProps {
  demarcheType: string;
  fraisDossier: number;
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

export const PaymentDetailsSummary = ({
  demarcheType,
  fraisDossier,
  montantTtc,
  trackingServices,
  actionRapideTitre,
}: PaymentDetailsSummaryProps) => {
  // Calculate totals based on demarche type
  const totalOptions = trackingServices.reduce((sum, s) => sum + (s.price || 0), 0);
  
  if (demarcheType === "CG") {
    // For CG: prix carte grise = montant_ttc - frais_dossier - options - TVA on services
    // We need to reverse calculate: montant_ttc = prixCarteGrise + (fraisDossier + options) * 1.20
    // So: prixCarteGrise = montant_ttc - (fraisDossier + options) * 1.20
    const servicesHT = fraisDossier + totalOptions;
    const servicesTVA = servicesHT * 0.20;
    const prixCarteGrise = montantTtc - servicesHT - servicesTVA;
    const totalTTC = prixCarteGrise + servicesHT + servicesTVA;

    return (
      <div className="space-y-4">
        {/* Block 1: Carte grise (sans TVA) */}
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

        <Separator />

        {/* Block 2: Services (avec TVA 20%) */}
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

        <Separator />

        {/* Block 3: TVA et totaux */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total HT (services)</span>
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
  }

  // For other types (DA, DC, etc.): TVA on everything
  const totalHT = montantTtc / 1.20;
  const totalTVA = montantTtc - totalHT;

  return (
    <div className="space-y-4">
      {/* Services (avec TVA 20%) */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Services (HT)
        </p>
        
        {actionRapideTitre && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{actionRapideTitre}</span>
            <span>{(fraisDossier / 1.20).toFixed(2)} €</span>
          </div>
        )}

        {trackingServices.map((service) => (
          <div key={service.id} className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              {SERVICE_LABELS[service.service_type] || service.service_type}
            </span>
            <span>{(service.price / 1.20).toFixed(2)} €</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* TVA et totaux */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Total HT</span>
          <span>{totalHT.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">TVA (20%)</span>
          <span>{totalTVA.toFixed(2)} €</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between items-center font-semibold">
          <span>Total TTC</span>
          <span className="text-lg text-primary">{montantTtc.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
};
