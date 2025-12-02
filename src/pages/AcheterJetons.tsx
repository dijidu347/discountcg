import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Euro, CheckCircle, Loader2, CreditCard, Wallet, Percent, LogOut, Settings, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";
import { formatPrice } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

interface CreditPack {
  id: string;
  quantity: number;
  price: number;
  description: string;
  ordre: number;
}

const StripeCardForm = ({ 
  amount, 
  creditAmount, 
  garageId, 
  onSuccess 
}: { 
  amount: number; 
  creditAmount: number;
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
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-token-payment-intent",
        {
          body: {
            amount: Math.round(amount * 100),
            quantity: creditAmount,
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
          description: `${creditAmount}€ ont été ajoutés à votre solde.`,
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
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarageData();
      loadCreditPacks();
      initStripe();
      checkAdmin();
    }
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!roleData);
  };

  const loadGarageData = async () => {
    if (!user) return;

    const { data: garageData, error } = await supabase
      .from("garages")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error loading garage:", error);
      return;
    }

    setGarage(garageData);
  };

  const loadCreditPacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("token_pricing")
      .select("*")
      .eq("active", true)
      .order("ordre", { ascending: true });

    if (error) {
      console.error("Error loading credit packs:", error);
    } else {
      setCreditPacks(data || []);
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

  const handleSelectPack = (pack: CreditPack) => {
    setSelectedPack(pack);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setPaymentMethod(null);
    setSelectedPack(null);
    loadGarageData();
    navigate("/dashboard");
  };

  const handleWalletError = (error: string) => {
    toast({
      title: "❌ Erreur de paiement",
      description: error,
      variant: "destructive",
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getDiscount = (creditAmount: number, price: number) => {
    const discount = ((creditAmount - price) / creditAmount) * 100;
    return Math.round(discount);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      {/* Header - Same as Dashboard */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                DiscountCarteGrise
              </h1>
              <nav className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  Tableau de bord
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-demarches")}>
                  Mes démarches
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-factures")}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Mes factures
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/support")}>
                  Support
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Administration
                  </Button>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              {garage && <NotificationBell garageId={garage.id} />}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
            <Euro className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Recharger mon compte</h1>
          </div>
          <p className="text-muted-foreground">
            Rechargez votre solde et profitez de remises exclusives
          </p>
        </div>

        {garage && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Euro className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solde actuel</p>
                    <p className="text-2xl font-bold">{formatPrice(garage.token_balance || 0)}€</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {creditPacks.map((pack) => {
            const discount = getDiscount(pack.quantity, pack.price);
            const isPopular = pack.quantity === 200;

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
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    <Percent className="w-3 h-3" />
                    -{discount}%
                  </div>
                </div>
                <CardHeader className="pt-10">
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-primary" />
                    {pack.quantity}€ de crédit
                  </CardTitle>
                  <CardDescription>{pack.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPrice(pack.quantity)}€
                      </p>
                      <p className="text-3xl font-bold text-green-600">{formatPrice(pack.price)}€</p>
                      <p className="text-sm text-green-600 mt-1">
                        Économisez {formatPrice(pack.quantity - pack.price)}€
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleSelectPack(pack)}
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                    >
                      Recharger
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
                <CardTitle>Recharger {selectedPack.quantity}€</CardTitle>
                <CardDescription>
                  Montant à payer : {formatPrice(selectedPack.price)}€ (économisez {formatPrice(selectedPack.quantity - selectedPack.price)}€)
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
                        edgeFunctionName="create-token-payment-intent"
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
                        creditAmount={selectedPack.quantity}
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
      </div>
    </div>
  );
}
