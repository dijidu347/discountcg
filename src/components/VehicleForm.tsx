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
  onVehicleSelect: (vehicleId: string, immatriculation: string) => void;
  selectedVehicleId?: string | null;
}

export function VehicleForm({ garageId, onVehicleSelect, selectedVehicleId }: VehicleFormProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    immatriculation: "",
    numero_formule: "",
    marque: "",
    modele: "",
    carrosserie: "",
    co2: "",
    couleur: "",
    cylindree: "",
    date_cg: "",
    date_mec: "",
    energie: "",
    genre: "",
    puiss_ch: "",
    puiss_fisc: "",
    type: "",
    version: "",
    vin: "",
    ptr: ""
  });

  useEffect(() => {
    loadVehicles();
  }, [garageId]);

  const loadVehicles = async () => {
    const { data } = await supabase
      .from('vehicules')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });

    if (data) {
      setVehicles(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      // Prepare data for validation
      const validationData = {
        immatriculation: formData.immatriculation.toUpperCase(),
        numero_formule: formData.numero_formule || undefined,
        marque: formData.marque || undefined,
        modele: formData.modele || undefined,
        carrosserie: formData.carrosserie || undefined,
        co2: formData.co2 ? parseFloat(formData.co2) : null,
        couleur: formData.couleur || undefined,
        cylindree: formData.cylindree ? parseFloat(formData.cylindree) : null,
        date_cg: formData.date_cg || null,
        date_mec: formData.date_mec || null,
        energie: formData.energie || undefined,
        genre: formData.genre || undefined,
        puiss_ch: formData.puiss_ch ? parseFloat(formData.puiss_ch) : null,
        puiss_fisc: formData.puiss_fisc ? parseFloat(formData.puiss_fisc) : null,
        type: formData.type || undefined,
        version: formData.version || undefined,
        vin: formData.vin || undefined,
        ptr: formData.ptr ? parseFloat(formData.ptr) : null
      };

      // Validate with Zod
      const validatedData = vehicleSchema.parse(validationData);

      const { data, error } = await supabase
        .from('vehicules')
        .insert({
          garage_id: garageId,
          immatriculation: validatedData.immatriculation,
          numero_formule: validatedData.numero_formule || null,
          marque: validatedData.marque || null,
          modele: validatedData.modele || null,
          carrosserie: validatedData.carrosserie || null,
          co2: validatedData.co2,
          couleur: validatedData.couleur || null,
          cylindree: validatedData.cylindree,
          date_cg: validatedData.date_cg,
          date_mec: validatedData.date_mec,
          energie: validatedData.energie || null,
          genre: validatedData.genre || null,
          puiss_ch: validatedData.puiss_ch,
          puiss_fisc: validatedData.puiss_fisc,
          type: validatedData.type || null,
          version: validatedData.version || null,
          vin: validatedData.vin || null,
          ptr: validatedData.ptr
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
        numero_formule: "",
        marque: "",
        modele: "",
        carrosserie: "",
        co2: "",
        couleur: "",
        cylindree: "",
        date_cg: "",
        date_mec: "",
        energie: "",
        genre: "",
        puiss_ch: "",
        puiss_fisc: "",
        type: "",
        version: "",
        vin: "",
        ptr: ""
      });
      
      setShowForm(false);
      loadVehicles();
      
      if (data) {
        onVehicleSelect(data.id, data.immatriculation);
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
      onVehicleSelect(vehicleId, vehicle.immatriculation);
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
            <Select value={selectedVehicleId || ""} onValueChange={handleVehicleSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir dans l'historique" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.immatriculation} {vehicle.marque && vehicle.modele ? `- ${vehicle.marque} ${vehicle.modele}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="immatriculation">
                  Immatriculation *
                  <span className="text-xs text-muted-foreground block mt-1">
                    Format: "AA-123-CD" (SIV), "1234-ABC-34" (FNI), ou VIN 17 caractères (Import)
                  </span>
                </Label>
                <Input
                  id="immatriculation"
                  placeholder="AA-123-CD"
                  value={formData.immatriculation}
                  onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_formule">Numéro de formule</Label>
                <Input
                  id="numero_formule"
                  value={formData.numero_formule}
                  onChange={(e) => setFormData({ ...formData, numero_formule: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  placeholder="17 caractères"
                  maxLength={17}
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
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

              <div className="space-y-2">
                <Label htmlFor="carrosserie">Carrosserie</Label>
                <Input
                  id="carrosserie"
                  value={formData.carrosserie}
                  onChange={(e) => setFormData({ ...formData, carrosserie: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="couleur">Couleur</Label>
                <Input
                  id="couleur"
                  value={formData.couleur}
                  onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="energie">Énergie</Label>
                <Input
                  id="energie"
                  placeholder="Essence, Diesel, Électrique..."
                  value={formData.energie}
                  onChange={(e) => setFormData({ ...formData, energie: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  placeholder="VP, CTTE, MTL..."
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cylindree">Cylindrée (cm³)</Label>
                <Input
                  id="cylindree"
                  type="number"
                  value={formData.cylindree}
                  onChange={(e) => setFormData({ ...formData, cylindree: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="puiss_ch">Puissance (ch)</Label>
                <Input
                  id="puiss_ch"
                  type="number"
                  value={formData.puiss_ch}
                  onChange={(e) => setFormData({ ...formData, puiss_ch: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="puiss_fisc">Puissance fiscale (CV)</Label>
                <Input
                  id="puiss_fisc"
                  type="number"
                  value={formData.puiss_fisc}
                  onChange={(e) => setFormData({ ...formData, puiss_fisc: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co2">CO2 (g/km)</Label>
                <Input
                  id="co2"
                  type="number"
                  value={formData.co2}
                  onChange={(e) => setFormData({ ...formData, co2: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ptr">PTR (kg)</Label>
                <Input
                  id="ptr"
                  type="number"
                  placeholder="Poids Total Roulant"
                  value={formData.ptr}
                  onChange={(e) => setFormData({ ...formData, ptr: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_cg">Date CG (dd/MM/yyyy)</Label>
                <Input
                  id="date_cg"
                  type="date"
                  value={formData.date_cg}
                  onChange={(e) => setFormData({ ...formData, date_cg: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_mec">Date MEC (dd/MM/yyyy)</Label>
                <Input
                  id="date_mec"
                  type="date"
                  value={formData.date_mec}
                  onChange={(e) => setFormData({ ...formData, date_mec: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enregistrement..." : "Enregistrer le véhicule"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
