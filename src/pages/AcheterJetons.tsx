import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Coins, CheckCircle, Loader2, CreditCard, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";
import { formatPrice } from "@/lib/utils";

interface TokenPack {
  id: string;
  quantity: number;
  price: number;
  description: string;
  ordre: number;
}

const StripeCardForm = ({ 
  amount, 
  quantity, 
  garageId, 
  onSuccess 
}: { 
  amount: number; 
  quantity: number;
  garageId: string;
  onSuccess: () => void;
}) => {
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
      // Create payment intent pour les jetons
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-token-payment-intent",
        {
          body: {
            amount: Math.round(amount * 100),
            quantity,
            garage_id: garageId,
          },
        }
      );

      if (paymentError) throw paymentError;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Élément de carte introuvable");

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
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
          description: `${quantity} jetons ont été ajoutés à votre compte.`,
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
            Confirmer le paiement
          </>
        )}
      </Button>
    </form>
  );
};

export default function AcheterJetons() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
  const [tokenPacks, setTokenPacks] = useState<TokenPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<TokenPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarageData();
      loadTokenPacks();
      initStripe();
    }
  }, [user]);

  const loadGarageData = async () => {
    if (!user) return;

    const { data: garageData, error } = await supabase
      .from("garages")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error loading garage:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du garage.",
        variant: "destructive",
      });
      return;
    }

    setGarage(garageData);
  };

  const loadTokenPacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("token_pricing")
      .select("*")
      .eq("active", true)
      .order("ordre", { ascending: true });

    if (error) {
      console.error("Error loading token packs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les packs de jetons.",
        variant: "destructive",
      });
    } else {
      setTokenPacks(data || []);
    }
    setLoading(false);
  };

  const initStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-stripe-key");
      if (error) throw error;
      const stripe = await loadStripe(data.publishableKey);
      setStripePromise(Promise.resolve(stripe));
    } catch (error) {
      console.error("Error initializing Stripe:", error);
    }
  };

  const handleSelectPack = (pack: TokenPack) => {
    setSelectedPack(pack);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setPaymentMethod(null);
    setSelectedPack(null);
    loadGarageData(); // Reload pour mettre à jour le solde
    navigate("/dashboard");
  };

  const handleWalletError = (error: string) => {
    toast({
      title: "❌ Erreur de paiement",
      description: error,
      variant: "destructive",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au tableau de bord
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Acheter des jetons</h1>
          </div>
          <p className="text-muted-foreground">
            Rechargez votre compte en jetons pour faciliter vos démarches
          </p>
        </div>

        {garage && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solde actuel</p>
                    <p className="text-2xl font-bold">{garage.token_balance || 0} jetons</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tokenPacks.map((pack) => {
            const pricePerToken = pack.price / pack.quantity;
            const isPopular = pack.quantity === 100;

            return (
              <Card 
                key={pack.id} 
                className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    Populaire
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-primary" />
                    {pack.quantity} jetons
                  </CardTitle>
                  <CardDescription>{pack.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">{formatPrice(pack.price)}€</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(pricePerToken)}€ par jeton
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleSelectPack(pack)}
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                    >
                      Acheter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Payment Dialog */}
        {showPaymentDialog && selectedPack && stripePromise && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Paiement - {selectedPack.quantity} jetons</CardTitle>
                <CardDescription>
                  Montant à payer : {formatPrice(selectedPack.price)}€
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!paymentMethod ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez votre méthode de paiement :
                    </p>
                    <div className="grid gap-4">
                      <Button
                        onClick={() => setPaymentMethod("wallet")}
                        variant="outline"
                        size="lg"
                        className="w-full h-16 text-left justify-start"
                      >
                        <Wallet className="w-5 h-5 mr-3" />
                        <div>
                          <div className="font-semibold">Apple Pay / Google Pay</div>
                          <div className="text-xs text-muted-foreground">Paiement rapide avec votre wallet</div>
                        </div>
                      </Button>
                      <Button
                        onClick={() => setPaymentMethod("card")}
                        variant="outline"
                        size="lg"
                        className="w-full h-16 text-left justify-start"
                      >
                        <CreditCard className="w-5 h-5 mr-3" />
                        <div>
                          <div className="font-semibold">Carte bancaire</div>
                          <div className="text-xs text-muted-foreground">Visa, Mastercard, etc.</div>
                        </div>
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowPaymentDialog(false);
                        setSelectedPack(null);
                      }}
                      className="w-full"
                    >
                      Annuler
                    </Button>
                  </div>
                ) : paymentMethod === "wallet" && garage ? (
                  <Elements stripe={stripePromise}>
                    <div className="space-y-4">
                      <StripeWalletPayment
                        amount={selectedPack.price}
                        onSuccess={handlePaymentSuccess}
                        onError={handleWalletError}
                        metadata={{
                          type: "token_purchase",
                          garage_id: garage.id,
                          quantity: selectedPack.quantity.toString(),
                        }}
                      />
                      <Button
                        variant="ghost"
                        onClick={() => setPaymentMethod(null)}
                        className="w-full"
                      >
                        Choisir une autre méthode
                      </Button>
                    </div>
                  </Elements>
                ) : (
                  <Elements stripe={stripePromise}>
                    <div className="space-y-4">
                      <StripeCardForm
                        amount={selectedPack.price}
                        quantity={selectedPack.quantity}
                        garageId={garage?.id}
                        onSuccess={handlePaymentSuccess}
                      />
                      <Button
                        variant="ghost"
                        onClick={() => setPaymentMethod(null)}
                        className="w-full"
                      >
                        Choisir une autre méthode
                      </Button>
                    </div>
                  </Elements>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}