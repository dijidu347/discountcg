import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Car, Calendar, Palette, Zap, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getVehicleByPlate, calculateCarteGrisePrice } from "@/lib/vehicle-api";
import { supabase } from "@/integrations/supabase/client";

export const PriceSimulator = () => {
  const [plate, setPlate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [price, setPrice] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!plate || plate.length < 6) {
      toast({
        title: "Plaque invalide",
        description: "Veuillez entrer une plaque d'immatriculation valide",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setVehicleData(null);
    setPrice(null);

    try {
      const result = await getVehicleByPlate(plate);
      
      if (result.success && result.data) {
        setVehicleData(result.data);
        const calculatedPrice = calculateCarteGrisePrice(result.data);
        setPrice(calculatedPrice);
        
        toast({
          title: "Véhicule trouvé ! ✅",
          description: "Les informations ont été récupérées avec succès",
        });
      } else {
        toast({
          title: "Véhicule non trouvé",
          description: "Impossible de trouver les informations pour cette plaque",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la recherche",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderNow = async () => {
    if (!vehicleData || !price) {
      toast({
        title: "Aucune estimation",
        description: "Veuillez d'abord rechercher votre véhicule",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create guest order
      const { data: orderData, error: orderError } = await supabase
        .from("guest_orders")
        .insert([{
          immatriculation: plate,
          marque: vehicleData.marque || "",
          modele: vehicleData.modele || "",
          date_mec: vehicleData.date_mec || "",
          puiss_fisc: vehicleData.puiss_fisc || 0,
          energie: vehicleData.energie || "",
          montant_ht: price,
          montant_ttc: price + 30,
          frais_dossier: 30,
          email: "",
          telephone: "",
          nom: "",
          prenom: "",
          adresse: "",
          code_postal: "",
          ville: "",
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      toast({
        title: "Commande créée",
        description: "Vous allez être redirigé vers le formulaire",
      });

      navigate(`/commander/${orderData.id}`);
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la commande",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-2xl border-2 border-primary/30 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground pb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Car className="w-10 h-10" />
          <CardTitle className="text-3xl md:text-4xl font-black text-center">
            Simulateur de Prix Carte Grise
          </CardTitle>
        </div>
        <CardDescription className="text-primary-foreground/90 text-center text-lg font-medium">
          Obtenez un devis instantané en entrant votre plaque d'immatriculation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-8 space-y-8">
        {/* Champ de recherche */}
        <div className="space-y-4">
          <Label htmlFor="plate" className="text-xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Plaque d'immatriculation
          </Label>
          <div className="flex gap-3">
            <Input
              id="plate"
              placeholder="Ex: AB-123-CD"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="text-2xl font-mono uppercase h-16 text-center tracking-widest border-2 border-primary/30 focus:border-primary shadow-lg"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              size="lg"
              className="px-8 h-16 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Search className="w-6 h-6 mr-2" />
                  Rechercher
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Informations du véhicule - Version améliorée */}
        {vehicleData && (
          <div className="space-y-6 p-8 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 rounded-2xl border-2 border-primary/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-black text-2xl text-primary">Informations du Véhicule</h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicleData.marque && (
                <div className="bg-card p-5 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <Car className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Marque</span>
                  </div>
                  <p className="font-bold text-xl text-foreground">{vehicleData.marque}</p>
                </div>
              )}
              
              {vehicleData.modele && (
                <div className="bg-card p-5 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <Car className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Modèle</span>
                  </div>
                  <p className="font-bold text-xl text-foreground">{vehicleData.modele}</p>
                </div>
              )}
              
              {vehicleData.couleur && (
                <div className="bg-card p-5 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Couleur</span>
                  </div>
                  <p className="font-bold text-xl text-foreground capitalize">{vehicleData.couleur}</p>
                </div>
              )}
              
              {vehicleData.energie && (
                <div className="bg-card p-5 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Énergie</span>
                  </div>
                  <p className="font-bold text-xl text-foreground">{vehicleData.energie}</p>
                </div>
              )}
              
              {vehicleData.puissance_fiscale && (
                <div className="bg-card p-5 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <Gauge className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Puissance</span>
                  </div>
                  <p className="font-bold text-xl text-foreground">{vehicleData.puissance_fiscale} CV</p>
                </div>
              )}
              
              {vehicleData.date_mec && (
                <div className="bg-card p-5 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mise en circulation</span>
                  </div>
                  <p className="font-bold text-xl text-foreground">{vehicleData.date_mec}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prix - Version améliorée */}
        {price !== null && (
          <div className="relative overflow-hidden rounded-2xl shadow-2xl border-2 border-primary">
            {/* Background animé */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
            
            <div className="relative p-10 space-y-6">
              <div className="text-center space-y-4">
                <p className="text-primary-foreground/90 text-sm font-bold uppercase tracking-widest">
                  Prix estimé de la carte grise
                </p>
                <div className="space-y-2">
                  <p className="text-7xl font-black text-primary-foreground drop-shadow-lg">
                    {price.toFixed(2)} €
                  </p>
                  <div className="h-1 w-32 bg-accent mx-auto rounded-full" />
                </div>
                
                <div className="pt-6 space-y-3">
                  <div className="flex items-center justify-between text-primary-foreground/90 text-lg px-8">
                    <span>Prix de la carte grise</span>
                    <span className="font-bold">{price.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between text-primary-foreground/90 text-lg px-8">
                    <span>Frais de dossier</span>
                    <span className="font-bold">30,00 €</span>
                  </div>
                  <div className="h-px bg-primary-foreground/30 mx-8" />
                  <div className="flex items-center justify-between text-primary-foreground text-2xl font-black px-8 pt-2">
                    <span>TOTAL</span>
                    <span>{(price + 30).toFixed(2)} €</span>
                  </div>
                </div>
                
                <Button
                  size="lg"
                  variant="secondary"
                  className="mt-6 px-12 py-6 text-xl font-bold shadow-xl hover:scale-105 transition-transform"
                  onClick={() => {
                    const element = document.getElementById("contact");
                    if (element) element.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Commander maintenant
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
