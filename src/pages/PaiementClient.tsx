import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, CreditCard, ShieldCheck, AlertTriangle, Car } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { formatPrice } from "@/lib/utils";
import { USE_SOGECOMMERCE, redirectToSogecommerce } from "@/lib/sogecommerce";

// ---------------------------------------------------------------------------
// Stripe card form (inline, same pattern as PaiementDemarche)
// ---------------------------------------------------------------------------
const StripeCardForm = ({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Element de carte introuvable");

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) throw new Error(error.message);

      if (paymentIntent?.status === "succeeded") {
        toast({
          title: "Paiement accepte !",
          description: "Votre paiement a ete valide avec succes.",
          variant: "success" as any,
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Paiement refuse",
        description: error.message || "Votre paiement n'a pas pu etre traite. Veuillez reessayer.",
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
                "::placeholder": { color: "hsl(var(--muted-foreground))" },
              },
            },
          }}
        />
      </div>
      <Button type="submit" disabled={!stripe || isProcessing} size="lg" className="w-full text-lg h-12">
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

// ---------------------------------------------------------------------------
// Variante Sogecommerce (redirection page hébergée SG). Sans dépendance Stripe.
// ---------------------------------------------------------------------------
const SogecommerceClientCheckout = ({ token, amount }: { token: string; amount: number }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-sogecommerce-client-payment",
        { body: { token, returnUrl: window.location.href } }
      );
      if (error) throw error;
      redirectToSogecommerce(data); // quitte le site vers la page SG
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de démarrer le paiement. Veuillez réessayer.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-base">Paiement sécurisé</h3>
      <p className="text-sm text-muted-foreground">Carte bancaire, Apple Pay, Google Pay…</p>
      <Button onClick={handlePay} disabled={isProcessing} size="lg" className="w-full text-lg h-12">
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Redirection vers le paiement...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Payer {formatPrice(amount)} EUR
          </>
        )}
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
type PageStatus = "loading" | "ready" | "success" | "expired" | "already_paid" | "error";

const PaiementClient = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [demarche, setDemarche] = useState<any>(null);
  const [garageName, setGarageName] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [trackingServices, setTrackingServices] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      initialize();
    }
  }, [token]);

  const initialize = async () => {
    try {
      // 1. Fetch demarche by client_payment_token via edge function
      const { data: demarcheData, error: fetchError } = await supabase.functions.invoke(
        "get-demarche-by-payment-token",
        { body: { token } }
      );

      if (fetchError) {
        // Parse error response from edge function
        const errorBody = demarcheData || {};
        const errorMsg = errorBody?.error || "Lien de paiement invalide ou introuvable.";

        if (errorMsg.includes("expiré") || errorMsg.includes("expire")) {
          setStatus("expired");
        } else if (errorMsg.includes("déjà été effectué") || errorMsg.includes("deja")) {
          setStatus("already_paid");
        } else {
          setErrorMessage(errorMsg);
          setStatus("error");
        }
        return;
      }

      if (!demarcheData?.demarche) {
        setErrorMessage("Lien de paiement invalide ou introuvable.");
        setStatus("error");
        return;
      }

      const d = demarcheData.demarche;

      setDemarche(d);
      setGarageName(d.garages?.raison_sociale || "");

      // Fetch tracking services for options total
      const { data: trackingData } = await supabase
        .from("tracking_services")
        .select("*")
        .eq("demarche_id", d.id);
      if (trackingData) setTrackingServices(trackingData);

      // Mode Sogecommerce : pas de Stripe ni de clientSecret, on redirige au clic.
      if (USE_SOGECOMMERCE) {
        setStatus("ready");
        return;
      }

      // 5. Load Stripe 2 (client payments always use Stripe 2 for carte grise fees)
      const { data: keyData, error: keyError } = await supabase.functions.invoke("get-stripe-key");
      if (keyError || !keyData?.publishableKey) {
        throw new Error("Impossible de charger le systeme de paiement");
      }
      const stripeKey = keyData.publishableKey2 || keyData.publishableKey;
      console.log('Client payment: using Stripe 2');
      const stripe = await loadStripe(stripeKey);
      setStripePromise(stripe);

      // 6. Create payment intent via dedicated client edge function
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-client-payment-intent",
        { body: { token } }
      );

      if (paymentError || !paymentData?.clientSecret) {
        throw new Error("Impossible de creer le paiement");
      }

      setClientSecret(paymentData.clientSecret);
      setStatus("ready");
    } catch (error: any) {
      console.error("Initialization error:", error);
      setErrorMessage(error.message || "Une erreur est survenue.");
      setStatus("error");
    }
  };

  const calculateTotal = (d: any): number => {
    const prixCG = Number(d.prix_carte_grise) || 0;
    const frais = Number(d.frais_dossier) || 0;
    const optionsTotal = trackingServices.reduce((sum, s) => sum + Number(s.price || 0), 0);

    if (d.payment_mode === "client_pays_all") {
      return prixCG + frais + optionsTotal;
    }
    // split: client pays only prix_carte_grise
    return prixCG;
  };

  const handlePaymentSuccess = async () => {
    // The Stripe webhook automatically marks client_paid = true
    // when it receives the payment_intent.succeeded event with metadata.type === 'client_payment'
    setStatus("success");
  };

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold">Lien de paiement expire</h1>
            <p className="text-muted-foreground">
              Ce lien de paiement a expire. Veuillez contacter votre professionnel automobile pour obtenir un nouveau lien.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (status === "already_paid") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Paiement deja effectue</h1>
            <p className="text-muted-foreground">
              Le paiement pour cette demarche a deja ete effectue. Aucune action supplementaire n'est requise.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold">Erreur</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Paiement confirme !</h1>
            <p className="text-muted-foreground">
              Votre paiement a ete effectue avec succes. Votre demarche de carte grise est maintenant en cours de traitement.
            </p>
            <Card className="text-left">
              <CardContent className="pt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Immatriculation</span>
                  <span className="font-medium">{demarche?.immatriculation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant paye</span>
                  <span className="font-bold text-primary">{formatPrice(calculateTotal(demarche))} EUR</span>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Un email de confirmation vous sera envoye sous peu.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // status === "ready"
  // ---------------------------------------------------------------------------
  if (!demarche) return null;
  if (!USE_SOGECOMMERCE && (!clientSecret || !stripePromise)) return null;

  const totalAmount = calculateTotal(demarche);
  const prixCG = Number(demarche.prix_carte_grise) || 0;
  const frais = Number(demarche.frais_dossier) || 0;
  const isClientPaysAll = demarche.payment_mode === "client_pays_all";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Paiement de votre carte grise</h1>
          <p className="text-muted-foreground text-lg">
            Finalisez le paiement de votre demarche en toute securite
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr,400px] gap-6 max-w-7xl mx-auto">
          {/* Left column: Payment methods */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Choisissez votre moyen de paiement</CardTitle>
                <CardDescription>Tous les paiements sont securises et cryptes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {USE_SOGECOMMERCE ? (
                  <SogecommerceClientCheckout token={token!} amount={totalAmount} />
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">Carte bancaire</h3>
                    <p className="text-sm text-muted-foreground">Visa, Mastercard, American Express</p>
                    <Elements stripe={stripePromise}>
                      <StripeCardForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
                    </Elements>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center pt-2">
                  <ShieldCheck className="w-3 h-3 inline mr-1" />
                  Tous les paiements sont securises et cryptes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Summary */}
          <div className="space-y-4">
            <Card className="border-2 border-primary/20 sticky top-4">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Recapitulatif</CardTitle>
                {garageName && (
                  <CardDescription>
                    <Car className="w-4 h-4 inline mr-1" />
                    {garageName}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Immatriculation</span>
                    <span className="font-medium">{demarche.immatriculation}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Type de demarche</span>
                    <span className="font-medium">{demarche.type}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Prix carte grise</span>
                    <span>{formatPrice(prixCG)} EUR</span>
                  </div>
                  {isClientPaysAll && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Frais de dossier</span>
                        <span>{formatPrice(frais)} EUR</span>
                      </div>
                      {trackingServices.length > 0 && trackingServices.map((s: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{s.service_type === 'email' ? 'Suivi email' : s.service_type === 'email_phone' ? 'Suivi email + tel' : s.service_type}</span>
                          <span>{formatPrice(Number(s.price || 0))} EUR</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(totalAmount)} EUR</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <CreditCard className="w-3 h-3" />
                  <span>Paiement 100% securise</span>
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

export default PaiementClient;
