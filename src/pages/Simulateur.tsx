import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DepartmentSelect } from "@/components/simulateur/DepartmentSelect";
import { PlateInput } from "@/components/simulateur/PlateInput";
import { Loader2, Calculator, FileText, ArrowRightLeft, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getVehicleByPlate } from "@/lib/vehicle-api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type DemarcheType = "CG" | "DA" | "DC";

interface DemarcheTypeInfo {
  label: string;
  description: string;
  icon: React.ReactNode;
  prix: number;
  needsVehicleApi: boolean;
}

const demarcheTypes: Record<DemarcheType, DemarcheTypeInfo> = {
  CG: {
    label: "Demande de carte grise",
    description: "Changement de titulaire avec nouvelle immatriculation",
    icon: <Car className="w-5 h-5" />,
    prix: 30,
    needsVehicleApi: true,
  },
  DA: {
    label: "Déclaration d'achat",
    description: "Pour les professionnels qui achètent un véhicule",
    icon: <FileText className="w-5 h-5" />,
    prix: 10,
    needsVehicleApi: false,
  },
  DC: {
    label: "Déclaration de cession",
    description: "Pour déclarer la vente de votre véhicule",
    icon: <ArrowRightLeft className="w-5 h-5" />,
    prix: 10,
    needsVehicleApi: false,
  },
};

export default function Simulateur() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [demarcheType, setDemarcheType] = useState<DemarcheType>("CG");
  const [departement, setDepartement] = useState("");
  const [plaque, setPlaque] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePlate = (plate: string) => {
    const newFormat = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/i;
    const oldFormat = /^\d{3,4}-[A-Z]{3}-\d{2}$/i;
    return newFormat.test(plate) || oldFormat.test(plate);
  };

  const currentDemarche = demarcheTypes[demarcheType];
  const needsDepartement = demarcheType === "CG";
  
  const isFormValid = plaque && validatePlate(plaque) && (needsDepartement ? departement : true);

  const handleCalculate = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      let vehicleData = null;

      // Pour carte grise, on a besoin des données véhicule
      if (currentDemarche.needsVehicleApi) {
        const apiResponse = await getVehicleByPlate(plaque);

        if (!apiResponse.success || !apiResponse.data) {
          throw new Error(apiResponse.error || 'Impossible de récupérer les informations du véhicule');
        }

        vehicleData = {
          dateMiseEnCirculation: apiResponse.data.date_mec,
          chevauxFiscaux: apiResponse.data.puissance_fiscale,
        };
        
        if (!vehicleData.dateMiseEnCirculation || !vehicleData.chevauxFiscaux) {
          throw new Error('Données du véhicule incomplètes');
        }
      }

      // Créer une commande dans la base de données
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
          montant_ttc: currentDemarche.prix, // Prix sans TVA pour DA/DC
          frais_dossier: currentDemarche.prix,
          status: 'en_attente',
          paye: false,
          demarche_type: demarcheType,
        })
        .select()
        .single();

      if (error) throw error;

      // Rediriger vers la page appropriée
      if (demarcheType === "CG") {
        navigate(`/resultat-carte-grise?orderId=${order.id}&departement=${departement}&plaque=${plaque}`, {
          state: {
            vehicleData,
            departement,
            plaque,
          },
        });
      } else {
        // Pour DA et DC, rediriger vers une page dédiée
        navigate(`/demarche-simple?orderId=${order.id}&type=${demarcheType}&plaque=${plaque}`, {
          state: {
            demarcheType,
            plaque,
          },
        });
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl flex items-center justify-center gap-2">
                <Calculator className="w-8 h-8" />
                Simulateur de Prix
              </CardTitle>
              <CardDescription>
                Sélectionnez votre démarche et calculez le prix
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sélecteur de type de démarche */}
              <div className="space-y-2">
                <Label htmlFor="demarche-type">Type de démarche</Label>
                <Select 
                  value={demarcheType} 
                  onValueChange={(value) => setDemarcheType(value as DemarcheType)}
                >
                  <SelectTrigger id="demarche-type" className="w-full">
                    <SelectValue placeholder="Sélectionnez une démarche" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {Object.entries(demarcheTypes).map(([key, info]) => (
                      <SelectItem key={key} value={key} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          {info.icon}
                          <span>{info.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {currentDemarche.description}
                </p>
              </div>

              {/* Département (uniquement pour carte grise) */}
              {needsDepartement && (
                <DepartmentSelect
                  value={departement}
                  onChange={setDepartement}
                />
              )}

              <PlateInput
                value={plaque}
                onChange={setPlaque}
              />

              {/* Affichage du prix */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Prix de la démarche :</span>
                  <span className="text-lg font-bold text-primary">
                    {demarcheType === "CG" 
                      ? "Calcul après validation" 
                      : `${currentDemarche.prix}€`
                    }
                  </span>
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={!isFormValid || loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {demarcheType === "CG" ? "Calcul en cours..." : "Création en cours..."}
                  </>
                ) : (
                  <>
                    {currentDemarche.icon}
                    <span className="ml-2">
                      {demarcheType === "CG" ? "Calculer le prix" : "Commencer la démarche"}
                    </span>
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {demarcheType === "CG" 
                  ? "Le calcul est basé sur les tarifs officiels en vigueur"
                  : "Vous pourrez déposer vos documents après le paiement"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
