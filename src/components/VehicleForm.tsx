import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Car, Plus } from "lucide-react";
import { vehicleSchema } from "@/lib/validations";

interface VehicleFormProps {
  garageId: string;
  onVehicleSelect: (vehicleId: string, immatriculation: string, vehicleData?: any) => void;
  selectedVehicleId?: string | null;
}

export function VehicleForm({ garageId, onVehicleSelect, selectedVehicleId }: VehicleFormProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    vin: ""
  });

  useEffect(() => {
    loadVehicles();
  }, [garageId]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVehicles(vehicles);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredVehicles(
        vehicles.filter(v => 
          v.immatriculation?.toLowerCase().includes(query) ||
          v.marque?.toLowerCase().includes(query) ||
          v.modele?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, vehicles]);

  const loadVehicles = async () => {
    const { data } = await supabase
      .from('vehicules')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });

    if (data) {
      setVehicles(data);
      setFilteredVehicles(data);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Prepare data for validation
      const validationData = {
        immatriculation: formData.immatriculation.toUpperCase(),
        marque: formData.marque || undefined,
        modele: formData.modele || undefined,
        vin: formData.vin?.toUpperCase() || null
      };

      // Validate with Zod
      const validatedData = vehicleSchema.parse(validationData);

      const { data, error } = await supabase
        .from('vehicules')
        .insert({
          garage_id: garageId,
          immatriculation: validatedData.immatriculation,
          marque: validatedData.marque || null,
          modele: validatedData.modele || null,
          vin: validatedData.vin
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer le véhicule",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Véhicule enregistré",
        description: "Le véhicule a été ajouté à votre historique"
      });

      setFormData({
        immatriculation: "",
        marque: "",
        modele: "",
        vin: ""
      });
      
      setShowForm(false);
      loadVehicles();
      
      if (data) {
        onVehicleSelect(data.id, data.immatriculation, data);
      }
    } catch (error: any) {
      toast({
        title: "Erreur de validation",
        description: error.message || "Données invalides",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      onVehicleSelect(vehicleId, vehicle.immatriculation, vehicle);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Car className="mr-2 h-5 w-5" />
            Véhicule
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? "Annuler" : "Nouveau véhicule"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm && (
          <div className="space-y-2">
            <Label>Sélectionner un véhicule existant</Label>
            <Input
              placeholder="Rechercher par immat, marque ou modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
            <Select value={selectedVehicleId || ""} onValueChange={handleVehicleSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir dans l'historique" />
              </SelectTrigger>
              <SelectContent>
                {filteredVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.immatriculation} {vehicle.marque && vehicle.modele ? `- ${vehicle.marque} ${vehicle.modele}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showForm && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900">
              <p className="font-medium mb-1">Formats d'immatriculation acceptés :</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Nouveau format (SIV)</strong> : AA-123-AA</li>
                <li><strong>Ancien format (FNI)</strong> : 1234 ABC 45</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="immatriculation">
                  Immatriculation * 
                </Label>
                <Input
                  id="immatriculation"
                  placeholder="AA-123-AA ou 1234 ABC 45"
                  value={formData.immatriculation}
                  onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marque">Marque</Label>
                <Input
                  id="marque"
                  value={formData.marque}
                  onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modele">Modèle</Label>
                <Input
                  id="modele"
                  value={formData.modele}
                  onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="vin">VIN (optionnel)</Label>
                <Input
                  id="vin"
                  placeholder="17 caractères"
                  maxLength={17}
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.immatriculation.trim()}
              className="w-full"
            >
              {loading ? "Enregistrement..." : "Enregistrer le véhicule"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
