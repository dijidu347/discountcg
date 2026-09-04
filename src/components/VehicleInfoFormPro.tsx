import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { marqueDepuisVin } from "@/lib/vin";

export interface VehicleInfoPro {
  marque: string;
  modele: string;
  vin: string;
  date_mec?: string;
}

interface VehicleInfoFormProProps {
  onVehicleInfoChange: (data: VehicleInfoPro, isValid: boolean) => void;
  requireVin?: boolean;
  requireDateMec?: boolean;
}

export function VehicleInfoFormPro({ 
  onVehicleInfoChange, 
  requireVin = true,
  requireDateMec = false 
}: VehicleInfoFormProProps) {
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfoPro>({
    marque: "",
    modele: "",
    vin: "",
    date_mec: ""
  });

  // Marque renseignee automatiquement depuis le VIN : memorisee pour savoir si
  // le champ est encore "libre". Des que le client la corrige lui-meme, on
  // cesse de la remplacer.
  const marqueAutoRef = useRef<string>("");
  const [marqueDeduite, setMarqueDeduite] = useState(false);

  // Le VIN porte le code constructeur : la marque en decoule sans appel API.
  // L'API plaque, elle, ne sait pas repondre sur un VIN.
  useEffect(() => {
    const deduite = marqueDepuisVin(vehicleInfo.vin);
    if (!deduite) return;
    const libre = vehicleInfo.marque === "" || vehicleInfo.marque === marqueAutoRef.current;
    if (!libre || vehicleInfo.marque === deduite) return;
    marqueAutoRef.current = deduite;
    setMarqueDeduite(true);
    setVehicleInfo((prev) => ({ ...prev, marque: deduite }));
    // Seul le VIN doit relancer la deduction : ajouter marque bouclerait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleInfo.vin]);

  useEffect(() => {
    // Vérifier la validité
    const isValid = 
      vehicleInfo.marque.trim().length > 0 &&
      vehicleInfo.modele.trim().length > 0 &&
      (!requireVin || vehicleInfo.vin.trim().length >= 17);
    
    onVehicleInfoChange(vehicleInfo, isValid);
  }, [vehicleInfo, requireVin, onVehicleInfoChange]);

  const handleChange = (field: keyof VehicleInfoPro, value: string) => {
    if (field === "marque") {
      // Correction manuelle : elle prime, et le VIN ne l'ecrasera plus.
      marqueAutoRef.current = "";
      setMarqueDeduite(false);
    }
    setVehicleInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isVinValid = !requireVin || vehicleInfo.vin.trim().length >= 17;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          Informations du véhicule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="marque">Marque *</Label>
            <Input
              id="marque"
              placeholder="Ex: Renault, Peugeot..."
              value={vehicleInfo.marque}
              onChange={(e) => handleChange("marque", e.target.value)}
            />
            {marqueDeduite && (
              <p className="text-xs text-muted-foreground">
                Marque reconnue depuis le VIN. Corrigez-la si elle est inexacte.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="modele">Modèle *</Label>
            <Input
              id="modele"
              placeholder="Ex: Clio, 308..."
              value={vehicleInfo.modele}
              onChange={(e) => handleChange("modele", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vin">
            Numéro de châssis (VIN) {requireVin && "*"}
          </Label>
          <Input
            id="vin"
            placeholder="Ex: VF1XXXXXXXXX12345"
            value={vehicleInfo.vin}
            onChange={(e) => handleChange("vin", e.target.value.toUpperCase())}
            maxLength={17}
            className={requireVin && vehicleInfo.vin.length > 0 && !isVinValid ? "border-destructive" : ""}
          />
          {requireVin && vehicleInfo.vin.length > 0 && !isVinValid && (
            <p className="text-xs text-destructive">
              Le VIN doit contenir exactement 17 caractères ({vehicleInfo.vin.length}/17)
            </p>
          )}
        </div>

        {requireDateMec && (
          <div className="space-y-2">
            <Label htmlFor="date_mec">Date de première mise en circulation</Label>
            <Input
              id="date_mec"
              type="date"
              value={vehicleInfo.date_mec}
              onChange={(e) => handleChange("date_mec", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Optionnel si non connue</p>
          </div>
        )}

        {requireVin && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Le numéro VIN est obligatoire pour cette démarche. Il se trouve sur le certificat d'immatriculation étranger ou sur la plaque du châssis.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
