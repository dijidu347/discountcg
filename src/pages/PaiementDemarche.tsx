import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, CheckCircle, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PayPalButton } from "@/components/PayPalButton";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const StripeCardForm = ({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Élément de carte introuvable");

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (error) {
        // Détecter si l'erreur est due à un conflit test/live mode
        if (error.message?.includes('test mode') || error.message?.includes('live mode')) {
          toast({
            title: "Configuration mise à jour",
            description: "Les clés Stripe ont été modifiées. Veuillez rafraîchir la page complètement.",
            variant: "destructive",
          });
          // Forcer un rechargement complet de la page après 2 secondes
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        throw new Error(error.message);
      }

      if (paymentIntent?.status === "succeeded") {
        toast({
          title: "Paiement réussi",
          description: "Votre démarche a été payée avec succès",
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-background">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "hsl(var(--foreground))",
                "::placeholder": {
                  color: "hsl(var(--muted-foreground))",
                },
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        size="lg"
        className="w-full text-lg h-12"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Payer par carte
          </>
        )}
      </Button>
    </form>
  );
};

const PaiementDemarche = () => {
  const { demarcheId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [demarche, setDemarche] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [trackingService, setTrackingService] = useState<any>(null);
  const [actionRapide, setActionRapide] = useState<any>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    loadDemarche();
  }, [demarcheId]);

  const loadDemarche = async () => {
    if (!demarcheId) {
      navigate("/mes-demarches");
      return;
    }

    try {
      // Charger les détails de la démarche
      const { data: demarcheData, error: demarcheError } = await supabase
        .from("demarches")
        .select("*")
        .eq("id", demarcheId)
        .single();

      if (demarcheError || !demarcheData) {
        toast({
          title: "Erreur",
          description: "Démarche introuvable",
          variant: "destructive",
        });
        navigate("/mes-demarches");
        return;
      }

      if (demarcheData.paye) {
        toast({
          title: "Démarche déjà payée",
          description: "Redirection vers vos démarches",
        });
        navigate("/mes-demarches");
        return;
      }

      setDemarche(demarcheData);

      // Charger le service de suivi si présent
      const { data: trackingData } = await supabase
        .from("tracking_services")
        .select("*")
        .eq("demarche_id", demarcheId)
        .maybeSingle();

      if (trackingData) {
        setTrackingService(trackingData);
      }

      // Charger l'action rapide
      const { data: actionData } = await supabase
        .from("actions_rapides")
        .select("*")
        .eq("code", demarcheData.type)
        .single();

      if (actionData) {
        setActionRapide(actionData);
      }

      // Récupérer la clé publique Stripe
      const { data: keyData, error: keyError } = await supabase.functions.invoke("get-stripe-key");

      if (keyError || !keyData?.publishableKey) {
        throw new Error("Impossible de charger la clé Stripe");
      }

      // Forcer le rechargement de Stripe sans cache
      const stripe = await loadStripe(keyData.publishableKey, {
        stripeAccount: undefined,
      });
      setStripePromise(stripe);

      // Créer le payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            demarcheId,
            paymentType: "full",
          },
        }
      );

      if (paymentError || !paymentData?.clientSecret) {
        throw new Error("Impossible de créer le paiement");
      }

      setClientSecret(paymentData.clientSecret);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initialiser le paiement",
        variant: "destructive",
      });
      navigate("/mes-demarches");
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      // Mettre à jour le statut de la démarche
      const { error } = await supabase
        .from("demarches")
        .update({ 
          paye: true,
          status: 'en_attente',
          is_draft: false
        })
        .eq("id", demarcheId);

      if (error) {
        console.error("Error updating demarche:", error);
        toast({
          title: "Attention",
          description: "Paiement effectué mais erreur de mise à jour. Contactez le support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handlePaymentSuccess:", error);
    } finally {
      navigate("/mes-demarches");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!demarche || !clientSecret || !stripePromise) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/mes-demarches")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="grid lg:grid-cols-[1fr,400px] gap-6 max-w-7xl mx-auto">
          {/* Colonne gauche : Moyens de paiement */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Choisissez votre moyen de paiement</CardTitle>
                <CardDescription>Tous les paiements sont sécurisés et cryptés</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 1. Formulaire de carte Stripe */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">Carte bancaire</h3>
                  <p className="text-sm text-muted-foreground">
                    Visa, Mastercard, American Express
                  </p>
                  <Elements stripe={stripePromise}>
                    <StripeCardForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
                  </Elements>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                {/* 2. Apple Pay & Google Pay */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">Paiement rapide</h3>
                  <p className="text-sm text-muted-foreground">
                    Apple Pay, Google Pay et autres portefeuilles électroniques
                  </p>
                  <Elements stripe={stripePromise}>
                    <StripeWalletPayment 
                      amount={demarche.montant_ttc} 
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                {/* 3. PayPal avec 4X */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Paiement recommandé</p>
                      <h3 className="text-xl font-bold">Payez en 4x sans frais</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{(demarche.montant_ttc / 4).toFixed(2)} €</p>
                      <p className="text-sm text-muted-foreground">par mois</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    soit 4 mensualités de <span className="font-semibold text-foreground">{(demarche.montant_ttc / 4).toFixed(2)} €</span>
                  </p>
                  
                  <PayPalButton
                    amount={demarche.montant_ttc}
                    onSuccess={handlePaymentSuccess}
                    onError={(error) => {
                      console.error("PayPal error:", error);
                      toast({
                        title: "Erreur PayPal",
                        description: "Impossible de charger PayPal",
                        variant: "destructive",
                      });
                    }}
                  />
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  🔒 Tous les paiements sont sécurisés et cryptés
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Récapitulatif */}
          <div className="space-y-4">
            <Card className="border-2 border-primary/20 sticky top-4">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Récapitulatif</CardTitle>
                <CardDescription>Démarche {demarche.numero_demarche}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{demarche.type}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Immatriculation</span>
                    <span className="font-medium">{demarche.immatriculation}</span>
                  </div>
                </div>

                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-between"
                    >
                      <span>Détails des frais</span>
                      {showDetails ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {actionRapide && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Frais de dossier</span>
                        <span>{actionRapide.prix.toFixed(2)}€</span>
                      </div>
                    )}
                    
                    {demarche.type === 'CG' && demarche.frais_dossier > (actionRapide?.prix || 0) && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Prix carte grise</span>
                        <span>{(demarche.frais_dossier - (actionRapide?.prix || 0) - (trackingService?.price || 0)).toFixed(2)}€</span>
                      </div>
                    )}
                    
                    {trackingService && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Service de suivi premium</span>
                        <span>{trackingService.price.toFixed(2)}€</span>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">Total TTC</span>
                    <span className="text-2xl font-bold text-primary">
                      {demarche.montant_ttc.toFixed(2)}€
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <CreditCard className="w-3 h-3" />
                  <span>Paiement 100% sécurisé</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaiementDemarche;
