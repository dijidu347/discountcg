import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, CheckCircle, CreditCard, Euro, Percent, LogOut, Settings, Receipt } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalButton } from "@/components/PayPalButton";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";

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
          description: "Votre solde a été rechargé avec succès.",
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

export default function PaiementRecharge() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();
  
  const creditAmount = parseInt(searchParams.get("amount") || "0");
  const price = parseInt(searchParams.get("price") || "0");
  
  const [garage, setGarage] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && creditAmount > 0 && price > 0) {
      loadData();
    } else if (!authLoading && (creditAmount <= 0 || price <= 0)) {
      navigate("/acheter-jetons");
    }
  }, [user, creditAmount, price, authLoading]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Check admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!roleData);

      // Load garage
      const { data: garageData, error: garageError } = await supabase
        .from("garages")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (garageError || !garageData) {
        toast({
          title: "Erreur",
          description: "Garage introuvable",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setGarage(garageData);

      // Get Stripe key
      const { data: keyData, error: keyError } = await supabase.functions.invoke("get-stripe-key");

      if (keyError || !keyData?.publishableKey) {
        throw new Error("Impossible de charger la clé Stripe");
      }

      const stripe = await loadStripe(keyData.publishableKey);
      setStripePromise(stripe);

      // Create payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-token-payment-intent",
        {
          body: {
            amount: Math.round(price * 100),
            quantity: creditAmount,
            garage_id: garageData.id,
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
      navigate("/acheter-jetons");
    }
  };

  const handlePaymentSuccess = async () => {
    // Envoyer l'email de confirmation
    try {
      const newBalance = (garage?.token_balance || 0) + creditAmount;
      
      await supabase.functions.invoke("send-email", {
        body: {
          type: "recharge_confirmed",
          to: garage?.email,
          data: {
            garage_name: garage?.raison_sociale,
            amount: creditAmount,
            price: price,
            new_balance: newBalance,
          },
        },
      });
    } catch (error) {
      console.error("Error sending recharge email:", error);
    }

    toast({
      title: "✅ Recharge effectuée !",
      description: `${creditAmount}€ ont été ajoutés à votre solde.`,
      variant: "success" as any,
    });
    
    const newBalance = (garage?.token_balance || 0) + creditAmount;
    navigate(`/paiement-recharge-succes?amount=${creditAmount}&balance=${newBalance}`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const discount = Math.round(((creditAmount - price) / creditAmount) * 100);
  const canUsePayPal4x = price >= 30;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!garage || !clientSecret || !stripePromise) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      {/* Header */}
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

      <div className="container mx-auto px-4 py-8 md:py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/acheter-jetons")}
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
                      amount={price} 
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
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Paiement recommandé</p>
                        <h3 className="text-xl font-bold">Payez en 4x sans frais</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{formatPrice(price / 4)} €</p>
                        <p className="text-sm text-muted-foreground">par mois</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      soit 4 mensualités de <span className="font-semibold text-foreground">{formatPrice(price / 4)} €</span>
                    </p>
                    
                    <PayPalButton
                      amount={price}
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
                  <div className="border rounded-lg p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">PayPal</h3>
                      <p className="text-sm text-muted-foreground">
                        Paiement sécurisé via PayPal
                      </p>
                    </div>
                    
                    <PayPalButton
                      amount={price}
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
                <CardTitle className="text-xl flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  Récapitulatif
                </CardTitle>
                <CardDescription>Recharge de solde</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Crédit ajouté</span>
                    <span className="font-medium">{creditAmount}€</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Prix normal</span>
                    <span className="font-medium line-through text-muted-foreground">{creditAmount}€</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Remise ({discount}%)
                    </span>
                    <span className="font-medium text-green-600">-{formatPrice(creditAmount - price)}€</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">À payer</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(price)}€
                    </span>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-4">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    🎉 Vous économisez {formatPrice(creditAmount - price)}€ !
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <CreditCard className="w-4 h-4" />
                  <span>Paiement 100% sécurisé</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
