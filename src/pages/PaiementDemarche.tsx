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
import { formatPrice } from "@/lib/utils";

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
  const [garage, setGarage] = useState<any>(null);
  const [showBalanceConfirm, setShowBalanceConfirm] = useState(false);
  const [isProcessingBalance, setIsProcessingBalance] = useState(false);
  
  // Montant calculé (sans TVA)
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);

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

      // Charger les infos du garage pour le solde
      const { data: garageData } = await supabase
        .from("garages")
        .select("*")
        .eq("id", demarcheData.garage_id)
        .single();

      if (garageData) {
        setGarage(garageData);
      }

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

  // Callback pour récupérer le montant calculé
  const handlePaymentCalculated = useCallback((result: PaymentCalculationResult) => {
    setCalculatedTotal(result.totalTTC);
  }, []);

  // canPayWithBalance est calculé plus bas après le calcul de finalAmount

  // Gérer le paiement par solde
  const handleBalancePayment = async () => {
    if (!garage || !demarcheId || calculatedTotal === null) return;

    setIsProcessingBalance(true);

    try {
      const newBalance = garage.token_balance - calculatedTotal;

      // Déduire du solde
      const { error: balanceError } = await supabase
        .from("garages")
        .update({ token_balance: newBalance })
        .eq("id", garage.id);

      if (balanceError) throw balanceError;

      // Marquer la démarche comme payée
      const { error: demarcheError } = await supabase
        .from("demarches")
        .update({
          paye: true,
          paid_with_tokens: true,
          status: 'en_attente',
          is_draft: false
        })
        .eq("id", demarcheId);

      if (demarcheError) throw demarcheError;

      // Envoyer les emails
      try {
        // Email au garage
        await supabase.functions.invoke("send-email", {
          body: {
            type: "balance_payment_confirmed",
            to: garage.email,
            data: {
              garage_name: garage.raison_sociale,
              demarche_id: demarche.numero_demarche,
              immatriculation: demarche.immatriculation,
              amount: calculatedTotal,
              new_balance: newBalance,
              type: demarche.type,
            },
          },
        });

        // Emails aux admins
        const adminEmails = ["contact@discountcartegrise.fr", "mathieugaillac4@gmail.com"];
        for (const adminEmail of adminEmails) {
          await new Promise(resolve => setTimeout(resolve, 600));
          await supabase.functions.invoke("send-email", {
            body: {
              type: "admin_new_demarche",
              to: adminEmail,
              data: {
                type: demarche.type,
                reference: demarche.numero_demarche,
                immatriculation: demarche.immatriculation,
                client_name: garage.raison_sociale,
                montant_ttc: calculatedTotal,
                is_free_token: false,
              },
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending emails:", emailError);
      }

      toast({
        title: "✅ Paiement validé !",
        description: "Votre démarche a été payée avec votre solde.",
        variant: "success" as any,
      });

      navigate(`/paiement-solde-succes/${demarcheId}?amount=${calculatedTotal}&balance=${newBalance}`);
    } catch (error: any) {
      console.error("Balance payment error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du paiement",
        variant: "destructive",
      });
    } finally {
      setIsProcessingBalance(false);
      setShowBalanceConfirm(false);
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
      // Rediriger vers la page de succès
      navigate(`/paiement-succes/${demarcheId}`);
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

  // Calculer le montant correct sans TVA directement
  const prixCarteGrise = Number(demarche.prix_carte_grise) || 0;
  const fraisDossier = Number(demarche.frais_dossier) || 0;
  const optionsTotal = trackingServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalServices = fraisDossier + optionsTotal;
  
  // Utiliser le montant calculé correctement (sans TVA)
  const finalAmount = calculatedTotal !== null ? calculatedTotal : (prixCarteGrise + totalServices);
  
  // Vérifier si le paiement par solde est possible (utiliser finalAmount au lieu de calculatedTotal)
  const canPayWithBalance = garage && finalAmount > 0 && garage.token_balance >= finalAmount;
  
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
                {/* 0. Paiement par solde */}
                {garage && garage.token_balance > 0 && (
                  <div className={`border-2 rounded-lg p-6 space-y-4 ${canPayWithBalance ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-muted'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">Payer avec mon solde</h3>
                          <p className="text-sm text-muted-foreground">
                            Solde disponible : <span className="font-bold text-green-600">{formatPrice(garage.token_balance)}€</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {canPayWithBalance ? (
                      showBalanceConfirm ? (
                        <div className="space-y-3 bg-background p-4 rounded-lg border">
                          <p className="text-sm font-medium">
                            Souhaitez-vous utiliser votre solde pour payer cette démarche ?
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-bold">{formatPrice(finalAmount)}€</span> seront débités de votre solde.
                          </p>
                          <div className="flex gap-3">
                            <Button 
                              onClick={handleBalancePayment}
                              disabled={isProcessingBalance}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {isProcessingBalance ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Traitement...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Oui, payer avec mon solde
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => setShowBalanceConfirm(false)}
                              disabled={isProcessingBalance}
                            >
                              Non, autre moyen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => setShowBalanceConfirm(true)}
                          className="w-full bg-green-600 hover:bg-green-700"
                          size="lg"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Utiliser mon solde ({formatPrice(finalAmount)}€)
                        </Button>
                      )
                    ) : (
                      <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                        ⚠️ Solde insuffisant. Il vous manque <span className="font-bold">{formatPrice(finalAmount - garage.token_balance)}€</span>
                      </div>
                    )}
                  </div>
                )}

                {garage && garage.token_balance > 0 && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Ou payez par</span>
                    </div>
                  </div>
                )}

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
                      clientSecret={clientSecret}
                      onSuccess={handlePaymentSuccess}
                      onError={(error) => {
                        toast({
                          title: "❌ Paiement refusé",
                          description: error,
                          variant: "destructive",
                        });
                      }}
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
                        <p className="text-2xl font-bold text-primary">{formatPrice(finalAmount / 4)} €</p>
                        <p className="text-sm text-muted-foreground">par mois</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      soit 4 mensualités de <span className="font-semibold text-foreground">{formatPrice(finalAmount / 4)} €</span>
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
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(finalAmount)}€
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
