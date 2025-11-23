import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle } from "lucide-react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PayPalButton } from "@/components/PayPalButton";
import { StripeWalletPayment } from "@/components/StripeWalletPayment";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethodsProps {
  amount: number;
  orderId: string;
  onPaymentSuccess: () => void;
}

export const PaymentMethods = ({ amount, orderId, onPaymentSuccess }: PaymentMethodsProps) => {
  const [isPaid, setIsPaid] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const { toast } = useToast();

  useState(() => {
    const initStripe = async () => {
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
    initStripe();
  });

  const handlePaymentSuccess = async () => {
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

      setIsPaid(true);
      onPaymentSuccess();
      
      toast({
        title: "Paiement réussi",
        description: "Votre commande a été payée avec succès",
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la commande",
        variant: "destructive",
      });
    }
  };

  const handleStripePayment = () => {
    window.location.href = `/paiement/${orderId}`;
  };

  if (isPaid) {
    return (
      <Card className="border-green-500/50 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold text-lg">Paiement accepté ✔</p>
              <p className="text-sm">Merci ! Vous pouvez maintenant déposer vos documents.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const monthlyAmount = (amount / 4).toFixed(2);

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Highlighted 4x Payment */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Paiement recommandé</p>
              <h3 className="text-2xl font-bold">Payez en 4x sans frais</h3>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{monthlyAmount} €</p>
              <p className="text-sm text-muted-foreground">par mois</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              soit 4 mensualités de <span className="font-semibold text-foreground">{monthlyAmount} €</span>
            </p>
            <PayPalButton
              amount={amount}
              onSuccess={handlePaymentSuccess}
              onError={(error) => {
                console.error("PayPal error:", error);
                toast({
                  title: "Erreur PayPal",
                  description: "Une erreur est survenue lors du paiement",
                  variant: "destructive",
                });
              }}
            />
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Autres moyens de paiement</span>
          </div>
        </div>

        {stripePromise && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Paiement rapide</h3>
            <Elements stripe={stripePromise}>
              <StripeWalletPayment
                amount={amount}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">Carte bancaire</h3>
          <Button
            onClick={handleStripePayment}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Payer par carte ({amount.toFixed(2)} €)
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          🔒 Tous les paiements sont sécurisés et cryptés
        </p>
      </CardContent>
    </Card>
  );
};
