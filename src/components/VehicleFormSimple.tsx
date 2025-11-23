import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Car, Plus } from "lucide-react";

interface VehicleFormSimpleProps {
  garageId: string;
  onVehicleSelect: (vehicleId: string, immatriculation: string) => void;
  selectedVehicleId?: string | null;
}

export function VehicleFormSimple({ garageId, onVehicleSelect, selectedVehicleId }: VehicleFormSimpleProps) {
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
    if (searchQuery) {
      const filtered = vehicles.filter(v => 
        v.immatriculation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.marque?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.modele?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVehicles(filtered);
    } else {
      setFilteredVehicles(vehicles);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.immatriculation.trim()) {
      toast({
        title: "Erreur",
        description: "L'immatriculation est obligatoire",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('vehicules')
        .insert({
          garage_id: garageId,
          immatriculation: formData.immatriculation.toUpperCase(),
          marque: formData.marque || null,
          modele: formData.modele || null,
          vin: formData.vin || null
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Véhicule ajouté avec succès"
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
        onVehicleSelect(data.id, data.immatriculation);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le véhicule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      onVehicleSelect(vehicle.id, vehicle.immatriculation);
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
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "Annuler" : "Nouveau véhicule"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="immatriculation">Immatriculation *</Label>
              <Input
                id="immatriculation"
                placeholder="AA-123-AA"
                value={formData.immatriculation}
                onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marque">Marque</Label>
              <Input
                id="marque"
                placeholder="Renault, Peugeot..."
                value={formData.marque}
                onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modele">Modèle</Label>
              <Input
                id="modele"
                placeholder="Clio, 308..."
                value={formData.modele}
                onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">VIN (optionnel)</Label>
              <Input
                id="vin"
                placeholder="Numéro de série du véhicule"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enregistrement..." : "Enregistrer le véhicule"}
            </Button>
          </form>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="search">Rechercher un véhicule existant</Label>
              <Input
                id="search"
                placeholder="Immatriculation, marque, modèle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredVehicles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="vehicle-select">Sélectionner un véhicule</Label>
                <Select
                  value={selectedVehicleId || ""}
                  onValueChange={handleVehicleSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisissez un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.immatriculation}
                        {vehicle.marque && vehicle.modele && ` - ${vehicle.marque} ${vehicle.modele}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filteredVehicles.length === 0 && vehicles.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun véhicule trouvé
              </p>
            )}

            {vehicles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun véhicule enregistré. Cliquez sur "Nouveau véhicule" pour en ajouter un.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
