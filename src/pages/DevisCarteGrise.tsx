import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Car, CreditCard, ChevronLeft, Calendar, Palette, Zap, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PayPalButton } from "@/components/PayPalButton";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function DevisCarteGrise() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<"stripe" | "paypal" | "wallet" | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    initializeStripe();
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const initializeStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-key');
      
      if (error) throw error;
      
      if (data?.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      }
    } catch (error) {
      console.error("Error loading Stripe:", error);
    }
  };

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("guest_orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations de la commande",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripePayment = () => {
    navigate(`/paiement/${orderId}`);
  };

  const handlePayPalSuccess = async (details: any) => {
    try {
      const { error } = await supabase
        .from("guest_orders")
        .update({
          paye: true,
          paid_at: new Date().toISOString(),
          status: "paye",
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Paiement réussi",
        description: "Votre commande a été payée avec succès",
      });

      navigate(`/commander/${orderId}`);
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la commande",
        variant: "destructive",
      });
    }
  };

  const handlePayPalError = (error: any) => {
    console.error("PayPal error:", error);
    toast({
      title: "Erreur PayPal",
      description: "Une erreur est survenue lors du paiement",
      variant: "destructive",
    });
  };

  const handleWalletSuccess = async () => {
    try {
      const { error } = await supabase
        .from("guest_orders")
        .update({
          paye: true,
          paid_at: new Date().toISOString(),
          status: "paye",
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Paiement réussi",
        description: "Votre commande a été payée avec succès",
      });

      navigate(`/commander/${orderId}`);
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la commande",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Commande non trouvée</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Colonne gauche - Informations du véhicule et détails du prix */}
          <div className="space-y-6">
            {/* Informations du véhicule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Informations du Véhicule
                </CardTitle>
                <CardDescription>
                  Immatriculation: <span className="font-mono font-bold">{order.immatriculation}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {order.marque && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="w-4 h-4" />
                        <span>Marque</span>
                      </div>
                      <p className="font-semibold">{order.marque}</p>
                    </div>
                  )}
                  {order.modele && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="w-4 h-4" />
                        <span>Modèle</span>
                      </div>
                      <p className="font-semibold">{order.modele}</p>
                    </div>
                  )}
                  {order.energie && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="w-4 h-4" />
                        <span>Énergie</span>
                      </div>
                      <p className="font-semibold">{order.energie}</p>
                    </div>
                  )}
                  {order.puiss_fisc && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gauge className="w-4 h-4" />
                        <span>Puissance</span>
                      </div>
                      <p className="font-semibold">{order.puiss_fisc} CV</p>
                    </div>
                  )}
                  {order.date_mec && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Mise en circulation</span>
                      </div>
                      <p className="font-semibold">{order.date_mec}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Détails du prix */}
            <Card className="border-primary/30">
              <CardHeader className="bg-primary/5">
                <CardTitle>Détail du Prix</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between text-lg">
                  <span>Prix de la carte grise</span>
                  <span className="font-semibold">{order.montant_ht?.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Frais de dossier</span>
                  <span className="font-semibold">{order.frais_dossier?.toFixed(2)} €</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-2xl font-bold text-primary">
                    <span>Total TTC</span>
                    <span>{order.montant_ttc?.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Options de paiement */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Choisissez votre moyen de paiement
                </CardTitle>
                <CardDescription>
                  Sélectionnez le mode de paiement qui vous convient
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Apple Pay / Google Pay */}
                {stripePromise && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Paiement rapide</h3>
                    <Elements stripe={stripePromise}>
                      <StripeWalletPayment
                        amount={order.montant_ttc}
                        onSuccess={handleWalletSuccess}
                      />
                    </Elements>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                {/* PayPal */}
                <div className="space-y-3">
                  <h3 className="font-semibold">PayPal</h3>
                  <PayPalButton
                    amount={order.montant_ttc}
                    onSuccess={handlePayPalSuccess}
                    onError={handlePayPalError}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                {/* Stripe (Carte bancaire) */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Carte bancaire</h3>
                  <Button
                    onClick={handleStripePayment}
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payer par carte
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-6">
                  Tous les paiements sont sécurisés et cryptés
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
