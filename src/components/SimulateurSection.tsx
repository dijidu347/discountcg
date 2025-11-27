import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DepartmentSelect } from "@/components/simulateur/DepartmentSelect";
import { Loader2, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getVehicleByPlate } from "@/lib/vehicle-api";
import { Input } from "@/components/ui/input";

export const SimulateurSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [departement, setDepartement] = useState("");
  const [plaque, setPlaque] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePlate = (plate: string) => {
    const newFormat = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/i;
    const oldFormat = /^\d{3,4}-[A-Z]{3}-\d{2}$/i;
    return newFormat.test(plate) || oldFormat.test(plate);
  };

  const isFormValid = departement && plaque && validatePlate(plaque);

  const formatPlateDisplay = (value: string) => {
    // Format pour affichage dans la plaque visuelle
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 7)}`;
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Auto-format avec tirets
    let formatted = value.replace(/[^A-Z0-9-]/g, '');
    setPlaque(formatted);
  };

  const handleCalculate = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
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
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de récupérer les informations du véhicule",
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
          Calculez instantanément le prix de votre carte grise
        </p>

        <div className="max-w-xl mx-auto bg-card border border-border shadow-xl rounded-2xl p-8">
          {/* Plaque d'immatriculation visuelle */}
          <div className="mb-10 flex justify-center">
            <div className="w-full max-w-lg h-24 md:h-28 rounded-xl border-4 border-foreground/80 shadow-inner relative overflow-hidden bg-gradient-to-br from-muted to-muted/50">
              {/* Bande gauche - EU/F */}
              <div className="absolute inset-y-0 left-0 w-14 md:w-20 bg-primary flex flex-col items-center justify-center text-primary-foreground font-bold border-r-4 border-foreground/80">
                <span className="text-lg md:text-xl">F</span>
                <span className="text-xs md:text-sm mt-1">EU</span>
              </div>
              
              {/* Zone centrale - Numéro */}
              <div className="absolute inset-y-0 left-14 md:left-20 right-14 md:right-20 flex items-center justify-center">
                <span className="text-3xl md:text-5xl font-bold tracking-widest text-foreground font-mono">
                  {displayPlate}
                </span>
              </div>
              
              {/* Bande droite - Département */}
              <div className="absolute inset-y-0 right-0 w-14 md:w-20 bg-primary flex flex-col items-center justify-center text-primary-foreground border-l-4 border-foreground/80">
                <div className="w-5 h-5 md:w-7 md:h-7 bg-primary-foreground rounded-full mb-1" />
                <span className="text-lg md:text-xl font-bold">{displayDept}</span>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
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

            <DepartmentSelect
              value={departement}
              onChange={setDepartement}
            />

            <Button
              onClick={handleCalculate}
              disabled={!isFormValid || loading}
              className="w-full py-6 text-lg font-semibold rounded-xl"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 mr-2" />
                  Calculer le prix
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
