import { useState, useEffect, useCallback } from "react";
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
import { PaymentDetailsSummary, type PaymentCalculationResult } from "@/components/payment/PaymentDetailsSummary";

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
        throw new Error(error.message);
      }

      if (paymentIntent?.status === "succeeded") {
        toast({
          title: "✅ Paiement accepté !",
          description: "Votre paiement a été validé avec succès. Votre démarche est en cours de traitement.",
          variant: "success" as any,
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "❌ Paiement refusé",
        description: error.message || "Votre paiement n'a pas pu être traité. Veuillez réessayer.",
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
  const [trackingServices, setTrackingServices] = useState<any[]>([]);
  const [actionRapide, setActionRapide] = useState<any>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);
  
  // Montant TTC calculé correctement
  const [calculatedTTC, setCalculatedTTC] = useState<number>(0);

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

      // Charger tous les services de suivi
      const { data: trackingData } = await supabase
        .from("tracking_services")
        .select("*")
        .eq("demarche_id", demarcheId);

      if (trackingData && trackingData.length > 0) {
        setTrackingServices(trackingData);
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

      const stripe = await loadStripe(keyData.publishableKey);
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

  // Callback pour récupérer le montant TTC calculé
  const handlePaymentCalculated = useCallback((result: PaymentCalculationResult) => {
    setCalculatedTTC(result.totalTTC);
  }, []);

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

  // Utiliser le montant calculé ou le montant stocké si pas encore calculé
  const finalAmount = calculatedTTC > 0 ? calculatedTTC : demarche.montant_ttc;
  
  // PayPal 4x désactivé si montant < 30€
  const canUsePayPal4x = finalAmount >= 30;

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
                      amount={finalAmount} 
                      onSuccess={handlePaymentSuccess}
                      onError={(error) => {
                        toast({
                          title: "❌ Paiement refusé",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                      metadata={{ demarche_id: demarcheId || "", type: "demarche" }}
                      demarcheId={demarcheId || undefined}
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

                {/* 3. PayPal */}
                {canUsePayPal4x ? (
                  // PayPal avec option 4x (montant >= 30€)
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Paiement recommandé</p>
                        <h3 className="text-xl font-bold">Payez en 4x sans frais</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{(finalAmount / 4).toFixed(2)} €</p>
                        <p className="text-sm text-muted-foreground">par mois</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      soit 4 mensualités de <span className="font-semibold text-foreground">{(finalAmount / 4).toFixed(2)} €</span>
                    </p>
                    
                    <PayPalButton
                      amount={finalAmount}
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
                ) : (
                  // PayPal sans option 4x (montant < 30€)
                  <div className="border rounded-lg p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">PayPal</h3>
                      <p className="text-sm text-muted-foreground">
                        Paiement sécurisé via PayPal
                      </p>
                    </div>
                    
                    <PayPalButton
                      amount={finalAmount}
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
                    
                    <p className="text-xs text-muted-foreground">
                      Le paiement en 4x est disponible à partir de 30€
                    </p>
                  </div>
                )}

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
                  <CollapsibleContent className="mt-3">
                    <PaymentDetailsSummary
                      demarcheType={demarche.type}
                      fraisDossier={demarche.frais_dossier || 30}
                      montantTtc={demarche.montant_ttc}
                      trackingServices={trackingServices}
                      actionRapideTitre={actionRapide?.titre}
                      prixCarteGrise={demarche.prix_carte_grise || 0}
                      onCalculated={handlePaymentCalculated}
                    />
                  </CollapsibleContent>
                </Collapsible>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">Total TTC</span>
                    <span className="text-2xl font-bold text-primary">
                      {finalAmount.toFixed(2)}€
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
