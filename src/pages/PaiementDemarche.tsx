import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, CheckCircle, CreditCard, Wallet, Smartphone } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PayPalButton } from "@/components/PayPalButton";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";
import { Separator } from "@/components/ui/separator";

let stripePromise: any = null;

const StripeCardForm = ({ onSuccess }: { onSuccess: () => void }) => {
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
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/mes-demarches`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Erreur de paiement",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Paiement réussi",
          description: "Votre démarche a été payée avec succès",
        });
        onSuccess();
      }
    } catch (error: any) {
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
        <PaymentElement
          options={{
            layout: "tabs",
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

      // Récupérer la clé publique Stripe
      const { data: keyData, error: keyError } = await supabase.functions.invoke("get-stripe-key");

      if (keyError || !keyData?.publishableKey) {
        throw new Error("Impossible de charger la clé Stripe");
      }

      stripePromise = loadStripe(keyData.publishableKey);

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

  const handlePaymentSuccess = () => {
    navigate("/mes-demarches");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!demarche || !clientSecret) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/mes-demarches")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Paiement sécurisé</h1>
            <p className="text-xl text-muted-foreground">
              Démarche {demarche.numero_demarche}
            </p>
          </div>

          {/* Récapitulatif */}
          <Card className="border-2 border-primary">
            <CardHeader className="bg-primary/5">
              <CardTitle>Récapitulatif du paiement</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Type de démarche</span>
                <span className="font-medium">{demarche.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Immatriculation</span>
                <span className="font-medium">{demarche.immatriculation}</span>
              </div>
              {demarche.frais_dossier && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Frais de dossier</span>
                  <span className="font-medium">{demarche.frais_dossier.toFixed(2)}€</span>
                </div>
              )}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Montant total</span>
                  <span className="text-3xl font-bold text-primary">
                    {demarche.montant_ttc.toFixed(2)}€
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                <CreditCard className="w-4 h-4" />
                <span>Paiement sécurisé par Stripe</span>
              </div>
            </CardContent>
          </Card>

          {/* Section 1: Stripe Wallet (Apple Pay / Google Pay) */}
          <Card>
            <CardHeader className="bg-primary/5">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <CardTitle>Paiement rapide</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Apple Pay, Google Pay et autres portefeuilles électroniques
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "hsl(var(--primary))",
                      colorText: "hsl(var(--foreground))",
                      colorDanger: "hsl(var(--destructive))",
                      fontFamily: "system-ui, sans-serif",
                      borderRadius: "8px",
                    },
                  },
                }}
              >
                <StripeWalletPayment 
                  amount={demarche.montant_ttc} 
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </CardContent>
          </Card>

          <div className="relative">
            <Separator className="my-6" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4">
              <span className="text-sm text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Section 2: Stripe Card */}
          <Card>
            <CardHeader className="bg-primary/5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle>Carte bancaire</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Visa, Mastercard, American Express
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "hsl(var(--primary))",
                      colorText: "hsl(var(--foreground))",
                      colorDanger: "hsl(var(--destructive))",
                      fontFamily: "system-ui, sans-serif",
                      borderRadius: "8px",
                    },
                  },
                }}
              >
                <StripeCardForm onSuccess={handlePaymentSuccess} />
              </Elements>
            </CardContent>
          </Card>

          <div className="relative">
            <Separator className="my-6" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4">
              <span className="text-sm text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Section 3: PayPal */}
          <Card>
            <CardHeader className="bg-primary/5">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852.072-.455.462-.788.922-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.857.174-3.407-.721-4.489z"/>
                </svg>
                <CardTitle>PayPal</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Payez en 1x ou en 4x sans frais (à partir de 30€)
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <PayPalButton
                amount={demarche.montant_ttc}
                onSuccess={handlePaymentSuccess}
                onError={(error) => {
                  console.error("PayPal error:", error);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaiementDemarche;
