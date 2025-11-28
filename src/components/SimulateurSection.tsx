import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DepartmentSelect } from "@/components/simulateur/DepartmentSelect";
import { Loader2, Calculator, FileText, Car, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getVehicleByPlate } from "@/lib/vehicle-api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DemarcheType = 'CG' | 'DA' | 'DC';

interface DemarcheTypeInfo {
  label: string;
  description: string;
  icon: typeof FileText;
  prix: number;
  needsVehicleApi: boolean;
  needsDepartment: boolean;
}

const demarcheTypes: Record<DemarcheType, DemarcheTypeInfo> = {
  CG: {
    label: "Demande de carte grise",
    description: "Changement de titulaire complet avec nouvelle carte grise",
    icon: Car,
    prix: 0, // Calculé selon le véhicule
    needsVehicleApi: true,
    needsDepartment: true,
  },
  DA: {
    label: "Déclaration d'achat",
    description: "Enregistrement de l'achat d'un véhicule",
    icon: FileText,
    prix: 10,
    needsVehicleApi: false,
    needsDepartment: false,
  },
  DC: {
    label: "Déclaration de cession",
    description: "Enregistrement de la vente d'un véhicule",
    icon: FileCheck,
    prix: 10,
    needsVehicleApi: false,
    needsDepartment: false,
  },
};

export const SimulateurSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [demarcheType, setDemarcheType] = useState<DemarcheType>("CG");
  const [departement, setDepartement] = useState("");
  const [plaque, setPlaque] = useState("");
  const [loading, setLoading] = useState(false);

  const currentDemarche = demarcheTypes[demarcheType];

  const validatePlate = (plate: string) => {
    const newFormat = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/i;
    const oldFormat = /^\d{3,4}-[A-Z]{3}-\d{2}$/i;
    return newFormat.test(plate) || oldFormat.test(plate);
  };

  const isFormValid = () => {
    const plateValid = plaque && validatePlate(plaque);
    if (currentDemarche.needsDepartment) {
      return plateValid && departement;
    }
    return plateValid;
  };

  const formatPlateDisplay = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 7)}`;
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    let formatted = value.replace(/[^A-Z0-9-]/g, '');
    setPlaque(formatted);
  };

  const handleCalculate = async () => {
    if (!isFormValid()) return;

    setLoading(true);
    try {
      if (currentDemarche.needsVehicleApi) {
        // Parcours carte grise - besoin de l'API véhicule
        const apiResponse = await getVehicleByPlate(plaque);

        if (!apiResponse.success || !apiResponse.data) {
          throw new Error(apiResponse.error || 'Impossible de récupérer les informations du véhicule');
        }

        const vehicleData = {
          dateMiseEnCirculation: apiResponse.data.date_mec,
          chevauxFiscaux: apiResponse.data.puissance_fiscale,
        };
        
        if (!vehicleData.dateMiseEnCirculation || !vehicleData.chevauxFiscaux) {
          throw new Error('Données du véhicule incomplètes');
        }

        const { data: order, error } = await supabase
          .from('guest_orders')
          .insert({
            tracking_number: '',
            immatriculation: plaque,
            email: '',
            telephone: '',
            nom: '',
            prenom: '',
            adresse: '',
            code_postal: '',
            ville: '',
            montant_ht: 0,
            montant_ttc: 0,
            frais_dossier: 30,
            status: 'en_attente',
            paye: false,
            demarche_type: 'CG',
          })
          .select()
          .single();

        if (error) throw error;

        navigate(`/resultat-carte-grise?orderId=${order.id}&departement=${departement}&plaque=${plaque}`, {
          state: {
            vehicleData,
            departement,
            plaque,
          },
        });
      } else {
        // Parcours DA/DC - prix fixe
        const prixHT = currentDemarche.prix;
        const prixTTC = prixHT * 1.2;

        const { data: order, error } = await supabase
          .from('guest_orders')
          .insert({
            tracking_number: '',
            immatriculation: plaque,
            email: '',
            telephone: '',
            nom: '',
            prenom: '',
            adresse: '',
            code_postal: '',
            ville: '',
            montant_ht: prixHT,
            montant_ttc: prixTTC,
            frais_dossier: prixHT,
            status: 'en_attente',
            paye: false,
            demarche_type: demarcheType,
          })
          .select()
          .single();

        if (error) throw error;

        navigate(`/demarche-simple?orderId=${order.id}&type=${demarcheType}&plaque=${plaque}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const displayPlate = plaque ? formatPlateDisplay(plaque) : "AA-123-AA";
  const displayDept = departement || "75";

  return (
    <section className="py-20 bg-muted/30" id="simulateur">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Simulateur de prix
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Calculez instantanément le prix de votre démarche
        </p>

        <div className="max-w-xl mx-auto bg-card border border-border shadow-xl rounded-2xl p-8">
          {/* Plaque d'immatriculation visuelle */}
          <div className="mb-10 flex justify-center">
            <div className="w-full max-w-lg h-20 md:h-24 rounded-lg border-[3px] border-foreground shadow-lg relative overflow-hidden bg-background">
              <div className="absolute inset-[3px] rounded border border-foreground/30" />
              
              <div className="absolute inset-y-0 left-0 w-12 md:w-14 bg-[#003399] flex flex-col items-center justify-between py-1.5 md:py-2 rounded-l">
                <div className="relative w-8 h-8 md:w-9 md:h-9">
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 30 - 90) * (Math.PI / 180);
                    const x = 50 + 38 * Math.cos(angle);
                    const y = 50 + 38 * Math.sin(angle);
                    return (
                      <span
                        key={i}
                        className="absolute text-[#FFCC00] text-[6px] md:text-[7px]"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        ★
                      </span>
                    );
                  })}
                </div>
                <span className="text-white font-bold text-sm md:text-base">F</span>
              </div>
              
              <div className="absolute inset-y-0 left-12 md:left-14 right-12 md:right-14 flex items-center justify-center bg-background">
                <span className="text-2xl md:text-4xl font-black tracking-wider text-foreground" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {displayPlate}
                </span>
              </div>
              
              <div className="absolute inset-y-0 right-0 w-12 md:w-14 bg-[#003399] flex items-center justify-center rounded-r">
                <span className="text-white font-bold text-lg md:text-xl">{displayDept}</span>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            {/* Type de démarche */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type de démarche</label>
              <Select value={demarcheType} onValueChange={(v) => setDemarcheType(v as DemarcheType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une démarche" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(demarcheTypes).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <value.icon className="h-4 w-4" />
                        <span>{value.label}</span>
                        {value.prix > 0 && (
                          <span className="text-muted-foreground ml-2">({value.prix}€ HT)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{currentDemarche.description}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Immatriculation</label>
              <Input
                type="text"
                placeholder="AA-123-AA"
                value={plaque}
                onChange={handlePlateChange}
                className="text-center text-lg font-mono uppercase"
                maxLength={9}
              />
            </div>

            {currentDemarche.needsDepartment && (
              <DepartmentSelect
                value={departement}
                onChange={setDepartement}
              />
            )}

            {/* Prix affiché */}
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Prix de la démarche</p>
              <p className="text-2xl font-bold text-primary">
                {currentDemarche.prix > 0 
                  ? `${(currentDemarche.prix * 1.2).toFixed(2)}€ TTC`
                  : "Calcul après validation"
                }
              </p>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={!isFormValid() || loading}
              className="w-full py-6 text-lg font-semibold rounded-xl"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {currentDemarche.needsVehicleApi ? "Calcul en cours..." : "Traitement..."}
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 mr-2" />
                  {currentDemarche.needsVehicleApi ? "Calculer le prix" : "Continuer"}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Tarifs officiels en vigueur • Service habilité
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};